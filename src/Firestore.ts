import crypto from 'crypto';
import { db } from './firebase';
import IDatabase from './IDatabase';

/**
 * Firestore implementation of official LTIJS Database.js: https://github.com/Cvmcosta/ltijs/blob/664f25aa3f6c71f0592a02c6d5c394211b7dac55/src/Utils/Database.js
 * Code here follows official Database.js as closely as possible.
 */
export class Firestore implements IDatabase {
  // But in VS Code requires options type to be {{}} instead of {Object} in jsdoc annotation: https://stackoverflow.com/a/66587658/188740
  /**
   * @param {{}} options Options
   * @param {string} options.collectionPrefix A custom prefix to prepend to all collection paths. Defaults to empty string.
   * - Example 1: 'ltijs-' will create collections 'ltijs-accsesstoken', 'ltijs-platforms', etc.
   * - Example 2: 'ltijs/index/' will create subcollections 'ltijs/index/accesstoken', 'ltijs/index/platforms', etc.
   */
  constructor(options?: { collectionPrefix?: string }) {
    this.collectionPrefix = options?.collectionPrefix ?? '';
  }

  readonly collectionPrefix: string;

  /**
   * No-op, as setup for Firestore will happen outside of this class
   */
  async setup(): Promise<boolean> {
    console.log('Firestore setup');
    return true;
  }

  /**
   * No-op, as connection to Firestore never needs to be closed
   */
  async Close(): Promise<boolean> {
    console.log('Firestore close');
    return true;
  }

  private resolveCollectionPath(collection: string) {
    return this.collectionPrefix + collection;
  }

  private appendFilters(
    collectionRef: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
    query: Record<string, string | number | boolean>,
  ) {
    for (const key in query)
      collectionRef = collectionRef.where(key, '==', query[key]);

    return collectionRef;
  }

  hasExpired(document: unknown) {
    if (typeof document !== 'object' || document === null)
      return false;
    if (!('expiresAt' in document)) return false;

    const expiresAt = (document as { expiresAt: unknown }).expiresAt;
    if (typeof expiresAt !== 'object' || expiresAt === null)
      return false;
    if (!('toDate' in expiresAt)) return false;
    if (typeof expiresAt.toDate !== 'function') return false;

    const expirationDate = expiresAt.toDate();
    if (!(expirationDate instanceof Date)) return false;

    return expirationDate.getTime() < new Date().getTime();
  }

  /**
   * @description Get item or entire database.
   * @param {String} ENCRYPTIONKEY - Encryptionkey of the database, false if none
   * @param {String} collection - The collection to be accessed inside the database.
   * @param {Object} [query] - Query for the item you are looking for in the format {type: "type1"}.
   */
  async Get(
    ENCRYPTIONKEY: string,
    collection: string,
    query: Record<string, string | number | boolean>,
  ): Promise<Record<string, any>[] | boolean> {
    if (!collection) throw new Error('MISSING_COLLECTION');

    const result = (
      await this.appendFilters(
        db.collection(this.resolveCollectionPath(collection)),
        query,
      ).get()
    ).docs
      .map(doc => doc.data())
      .filter(doc => !this.hasExpired(doc));

    if (ENCRYPTIONKEY) {
      for (const i in result) {
        const temp = result[i];
        result[i] = JSON.parse(
          await this.Decrypt(
            result[i].data,
            result[i].iv,
            ENCRYPTIONKEY,
          ),
        );
        if (temp.createdAt) {
          const createdAt = temp.createdAt.toDate().getTime();
          result[i].createdAt = createdAt;
        }
      }
    }

    if (result.length === 0) return false;
    return result;
  }

  private collectionExpiresInMinutes: Partial<
    Record<string, number>
  > = {
    accesstoken: 60,
    contexttoken: 24 * 60,
    idtoken: 24 * 60,
    nonce: 2,
    state: 10,
  };

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60000);
  }

  private timestamps(collection: string) {
    const now = new Date();
    const expiresInMinutes =
      this.collectionExpiresInMinutes[collection];
    return {
      createdAt: now,
      expiresAt: expiresInMinutes
        ? this.addMinutes(now, expiresInMinutes)
        : undefined, // Firestore is configured to ignore undefined properties in firebase.ts
    };
  }

  async Insert(
    ENCRYPTIONKEY: string,
    collection: string,
    item: any,
    index: any,
  ): Promise<boolean> {
    if (!collection || !item || (ENCRYPTIONKEY && !index))
      throw new Error('MISSING_PARAMS');

    let newDocData = item;
    if (ENCRYPTIONKEY) {
      const encrypted = await this.Encrypt(
        JSON.stringify(item),
        ENCRYPTIONKEY,
      );
      newDocData = {
        ...index,
        iv: encrypted.iv,
        data: encrypted.data,
      };
    }

    await db.collection(this.resolveCollectionPath(collection)).add({
      ...newDocData,
      ...this.timestamps(collection),
    });
    return true;
  }

  async Replace(
    ENCRYPTIONKEY: string,
    collection: string,
    query: Record<string, string | number | boolean>,
    item: any,
    index: any,
  ): Promise<boolean> {
    if (!collection || !item || (ENCRYPTIONKEY && !index))
      throw new Error('MISSING_PARAMS');

    let newDocData = item;
    if (ENCRYPTIONKEY) {
      const encrypted = await this.Encrypt(
        JSON.stringify(item),
        ENCRYPTIONKEY,
      );
      newDocData = {
        ...index,
        iv: encrypted.iv,
        data: encrypted.data,
      };
    }

    // Setting a new expiresAt for document replacement is important in case that document is expired but still in Firestore.
    // In such scenario, we need to ensure that document is no longer expired so it'll be retrievable by Firestore.Get(): https://github.com/examind-ai/ltijs-firestore/issues/8
    newDocData = {
      ...newDocData,
      ...this.timestamps(collection),
    };

    try {
      await db.runTransaction(async transaction => {
        const snap = await transaction.get(
          this.appendFilters(
            db.collection(this.resolveCollectionPath(collection)),
            query,
          ),
        );

        if (snap.size > 1)
          throw new Error(
            `MULTIPLE_DOCUMENTS_FOUND: ${this.resolveCollectionPath(
              collection,
            )} | ${JSON.stringify(query)}`,
          );

        if (snap.size === 0)
          transaction.set(
            db
              .collection(this.resolveCollectionPath(collection))
              .doc(),
            newDocData,
          );
        else transaction.set(snap.docs[0].ref, newDocData);
      });
    } catch {
      throw new Error('TRANSACTION_ERROR');
    }

    return true;
  }

  async Modify(
    ENCRYPTIONKEY: string,
    collection: string,
    query: Record<string, string | number | boolean>,
    modification: Record<string, string | number | boolean>,
  ): Promise<boolean> {
    if (!collection || !query || !modification)
      throw new Error('MISSING_PARAMS');

    const snap = await this.appendFilters(
      db.collection(this.resolveCollectionPath(collection)),
      query,
    ).get();

    if (snap.size === 0) throw new Error('DOCUMENT_NOT_FOUND');
    if (snap.size > 1)
      throw new Error(
        `MULTIPLE_DOCUMENTS_FOUND: ${this.resolveCollectionPath(
          collection,
        )} | ${JSON.stringify(query)}`,
      );

    let newMod = modification;
    if (ENCRYPTIONKEY) {
      let result = snap.docs[0].data();
      if (result) {
        result = JSON.parse(
          await this.Decrypt(result.data, result.iv, ENCRYPTIONKEY),
        );
        result[Object.keys(modification)[0]] =
          Object.values(modification)[0];
        newMod = await this.Encrypt(
          JSON.stringify(result),
          ENCRYPTIONKEY,
        );
      }
    }

    await snap.docs[0].ref.update(newMod);
    return true;
  }

  async Delete(
    collection: string,
    query: Record<string, string | number | boolean>,
  ): Promise<boolean> {
    if (!collection || !query) throw new Error('MISSING_PARAMS');

    const batch = db.batch();

    const snap = await this.appendFilters(
      db.collection(this.resolveCollectionPath(collection)),
      query,
    ).get();

    snap.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    return true;
  }

  /**
   * @description Encrypts data.
   * @param {String} data - Data to be encrypted
   * @param {String} secret - Secret used in the encryption
   */
  private async Encrypt(data: string, secret: string) {
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    const key = hash.digest().slice(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return {
      iv: iv.toString('hex'),
      data: encrypted.toString('hex'),
    };
  }

  /**
   * @description Decrypts data.
   * @param {String} data - Data to be decrypted
   * @param {String} _iv - Encryption iv
   * @param {String} secret - Secret used in the encryption
   */
  private async Decrypt(data: string, _iv: string, secret: string) {
    const hash = crypto.createHash('sha256');
    hash.update(secret);
    const key = hash.digest().slice(0, 32);
    const iv = Buffer.from(_iv, 'hex');
    const encryptedText = Buffer.from(data, 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}
