<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="https://raw.githubusercontent.com/Cvmcosta/ltijs/master/docs/logo-300.svg"></img></a>
</div>

> LTIJS Firestore plugin.

## Introduction

This package allows [LTIJS](https://cvmcosta.github.io/ltijs) to work with a Firestore instead of MongoDB.

## Installation

```
npm install ltijs-firestore
```

Register the plugin during [LTIJS](https://cvmcosta.github.io/ltijs) setup:

```
import Firestore from 'ltijs-firestore';

lti.setup(
  'LTIKEY',
  { plugin: new Firestore() }
);

```

## Firestore Authentication

The `firebase-admin` library that's used in this package looks for a `GOOGLE_APPLICATION_CREDENTIALS` environment variable. That environment variable shall point to a GCP Service Account key. For simplicity, you can use the Firebase Admin SDK private key from Firebase Console:

![image](https://user-images.githubusercontent.com/504505/153650439-8940aa08-695d-4d4d-b4d2-55c28fe0c7c7.png)

Save that file somewhere (e.g. `./service-account.json`), then point `GOOGLE_APPLICATION_CREDENTIALS` to that file. If you use a `.env` file, it will look like this:

```
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

If you prefer to hard code the environment variable inside a Node.js file, it can look like this:

```
process.env.GOOGLE_APPLICATION_CREDENTIALS = './service-account.json'
```

While the Firebase Admin SDK private key is convenient, it grants more permissions than necessary. To adhere to the principle of least privilege, create a custom service account with only the `Cloud Datastore User` role and use that key instead:

![image](https://user-images.githubusercontent.com/504505/153652016-977bc74b-2707-4756-9d7e-16e2f8b4bf70.png)

## Contibution

If you find a bug or think that something is hard to understand, please open an issue. Pull requests are also welcome 🙂

### Unit Test

Running unit tests requires that the Firebase CLI (`firebase-tools`) is installed globally:

```
npm install -g firebase-tools@10.0.1
npm ci
npm run compile
npm test
```

To use VS Code's debugger:

- Open VS Code's `JavaScript Debug Terminal`
- Add breakpoints in `0-provider.js` or `Firestore.ts`
- Then `npm test` inside `JavaScript Debug Terminal`
