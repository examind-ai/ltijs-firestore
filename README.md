<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="https://raw.githubusercontent.com/Cvmcosta/ltijs/master/docs/logo-300.svg"></img></a>
</div>

> LTIJS Firestore plugin.

# Introduction

This package allows [LTIJS](https://cvmcosta.github.io/ltijs) to work with Firestore instead of MongoDB.

# Installation

```
npm install @examind/ltijs-firestore
```

Import package (TypeScript and ES Modules):

```
import { Firestore } from '@examind/ltijs-firestore';
```

Import package (CommonJS):

```
const { Firestore } = require('@examind/ltijs-firestore');
```

Register the plugin during [LTIJS](https://cvmcosta.github.io/ltijs) setup:

```
lti.setup(
  'LTIKEY',
  { plugin: new Firestore() }
);

```

The `Firestore` constructor accepts an options object with the following property:

- `collectionPrefix`: A custom prefix to prepend to all collection paths. Defaults to empty string.
  - Example 1: `ltijs-` will create collections 'ltijs-accsesstoken', 'ltijs-platforms', etc.
  - Example 2: `ltijs/index/` will create subcollections 'ltijs/index/accesstoken', 'ltijs/index/platforms', etc.

Example with options:

```
lti.setup(
  'LTIKEY',
  { plugin: new Firestore({collectionPrefix: 'ltijs-'}) }
);

```

## Firestore Authentication

The `firebase-admin` library that's used in this package looks for a `LTIJS_APPLICATION_CREDENTIALS` environment variable. That environment variable needs to point to a GCP Service Account key with access to Firestore. For simplicity, you can use the Firebase Admin SDK private key from Firebase Console:

- Select your project from [Firebase Console](https://console.firebase.google.com/)
- Go to `Project Settings` -> `Service accounts`, then download a new private key:

![image](https://user-images.githubusercontent.com/504505/154392946-8bb689c5-e68a-41f8-8981-862246ea4a00.png)

Save that file somewhere (e.g. `./service-account.json`), then point `LTIJS_APPLICATION_CREDENTIALS` to that file. If you use [dotenv](https://www.npmjs.com/package/dotenv), then your `.env` file will look like this:

```
LTIJS_APPLICATION_CREDENTIALS=./service-account.json
```

If you prefer to hard code the environment variable inside a Node.js file, you can do this:

```
process.env.LTIJS_APPLICATION_CREDENTIALS = './service-account.json'
```

Notes:

- Specifying the `LTIJS_APPLICATION_CREDENTIALS` environment variable is recommended, but if not available, `firebase-admin` will also look for a `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
- When using `LTIJS_APPLICATION_CREDENTIALS`, make sure the environment variable is set before you import `@examind/ltijs-firestore`. Example using dotenv:

```
import { config } from 'dotenv';
if (process.env.NODE_ENV !== 'production') config();
import { Firestore } from '@examind/ltijs-firestore';
```

The following will also work if you're using dotenv unconditionally:

```
import 'dotenv/config';
import { Firestore } from '@examind/ltijs-firestore';
```

- When using `GOOGLE_APPLICATION_CREDENTIALS`, it's not necessary to set the environment variable before you import `@examind/ltijs-firestore`, as `firebase-admin` will lazy load the credentials. For example, this will work:

```
import { config } from 'dotenv';
import { Firestore } from '@examind/ltijs-firestore';
if (process.env.NODE_ENV !== 'production') config();
```

- If running this inside of a GCP server (e.g. GCP Compute Engine, GCP Cloud Function, or GCP Cloud Run), you may omit the `LTIJS_APPLICATION_CREDENTIALS` environment variable, as `GOOGLE_APPLICATION_CREDENTIALS` will be set automatically using the default service account.

## Principle of Least Privilege

As an alternative to using the Firebase Admin SDK private key, you can choose to only grant the necessary permissions to `@examind/ltijs-firestore`. To do this, [create a custom service account](https://cloud.google.com/iam/docs/creating-managing-service-accounts) with only the `Cloud Datastore User` role and use its key instead.

## Purging Stale Documents

The default detabase provider of LTIJS uses MongoDB as its storage layer and it's configured to automatically purge stale documents. To set up the same behavior in Firestore, we'll use one of 2 strategies depending on which version of @examind/ltijs-firestore you're using.

### @examind/ltijs-firestore v2+

@examind/litjs-firestore@2+ sets `expiresAt` on the following documents:

- accesstoken
- contexttoken
- idtoken
- nonce
- state

Use this field set up [Firestore TTL Policies](https://firebase.google.com/docs/firestore/ttl) to auto-purge stale documents. You only need to set this up once.

Using gcloud, substitute your project ID for {project_id} and execute the following commands. Warning, this will take a while.

```
gcloud firestore fields ttls update expiresAt --collection-group=accesstoken --enable-ttl --project={project_id}
gcloud firestore fields ttls update expiresAt --collection-group=contexttoken --enable-ttl --project={project_id}
gcloud firestore fields ttls update expiresAt --collection-group=idtoken --enable-ttl --project={project_id}
gcloud firestore fields ttls update expiresAt --collection-group=nonce --enable-ttl --project={project_id}
gcloud firestore fields ttls update expiresAt --collection-group=state --enable-ttl --project={project_id}
```

To ensure that everything worked correctly, you can list all your TTL policies:

```
gcloud firestore fields ttls list --project={project_id}
```

#### Upgrade Guide

When upgrading from v1.1+, previous TTL policies will need to be deleted as Firestore only allows 1 TTL policy per collection group. You'll also want to amend the existing documents in the database so they include expiresAt fields.

Delete previous TTL policies:

```
gcloud firestore fields ttls update age1HourAt --collection-group=accesstoken --disable-ttl --project={project_id}
gcloud firestore fields ttls update age24HoursAt --collection-group=contexttoken --disable-ttl --project={project_id}
gcloud firestore fields ttls update age24HoursAt --collection-group=idtoken --disable-ttl --project={project_id}
gcloud firestore fields ttls update age2MinutesAt --collection-group=nonce --disable-ttl --project={project_id}
gcloud firestore fields ttls update age10MinutesAt --collection-group=state --disable-ttl --project={project_id}
```

To add `deletedAt` to existing documents, use firebase-admin to run the following script.  
You'll need to set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to a gcloud auth key for this to work: `export GOOGLE_APPLICATION_CREDENTIALS='./my-gcloud-auth-key.json'`

```
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp({ projectId: 'my-project-id' });
const db = getFirestore(app);

// Set this if you're using a collection prefix
const COLLECTION_PREFIX = '';

const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60000);

(async () => {
  const collectionExpiresInMinutes = {
    accesstoken: 60,
    contexttoken: 24 * 60,
    idtoken: 24 * 60,
    nonce: 2,
    state: 10,
  };

  for (const [collection, expiresInMinutes] of Object.entries(
    collectionExpiresInMinutes,
  )) {
    const documents = await db
      .collection(`${COLLECTION_PREFIX}${collection}`)
      .get();

    for (const document of documents.docs) {
      if (!document.data().createdAt) continue;
      await document.ref.update({
        expiresAt: addMinutes(
          document.data().createdAt.toDate(),
          expiresInMinutes,
        ),
      });
    }
  }

  console.log('Done');
})();
```

### @examind/ltijs-firestore v1.1.0 - v1.3.2

@examind/litjs-firestore@1.1.0 - 1.3.2 sets the following fields on all new documents created in Firestore:

- age2MinutesAt
- age10MinutesAt
- age1HourAt
- age24HoursAt

Use these fields to set up [Firestore TTL Policies](https://firebase.google.com/docs/firestore/ttl) to auto-purge stale documents. You only need to set this up once.

Using gcloud, substitute your project ID for {project_id} and execute the following commands. Warning, this will take a while.

```
gcloud firestore fields ttls update age1HourAt --collection-group=accesstoken --enable-ttl --project={project_id}
gcloud firestore fields ttls update age24HoursAt --collection-group=contexttoken --enable-ttl --project={project_id}
gcloud firestore fields ttls update age24HoursAt --collection-group=idtoken --enable-ttl --project={project_id}
gcloud firestore fields ttls update age2MinutesAt --collection-group=nonce --enable-ttl --project={project_id}
gcloud firestore fields ttls update age10MinutesAt --collection-group=state --enable-ttl --project={project_id}
```

To ensure that everything worked correctly, you can list all your TTL policies:

```
gcloud firestore fields ttls list --project={project_id}
```

### @examind/ltijs-firestore <= v1.0.0

Use [@examind/ltijs-firestore-scheduler](https://www.npmjs.com/package/@examind/ltijs-firestore-scheduler).

# Development

Clone this repo, navigate to its location in Terminal and run:

```

npm ci
npm run compile
npm link

```

In another project, link directly to this repo:

```

npm link @examind/ltijs-firestore

```

## Unit Test

Running unit tests requires that the Firebase CLI (`firebase-tools`) is installed globally:

```

npm install -g firebase-tools@12.4.2
npm ci
npm run compile
npm test

```

To use VS Code's debugger:

- Open VS Code's `JavaScript Debug Terminal`
- Add breakpoints in `0-provider.js` or `Firestore.ts`
- Then `npm test` inside `JavaScript Debug Terminal`

# Publish

- Bump version in package.json
- `npm install`
- Commit with message: `Release {version, e.g. 0.1.6}`
