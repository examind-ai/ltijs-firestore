type QueryValue = string | number | boolean;

export default interface IDatabase {
  setup(): Promise<boolean>;
  Close(): Promise<boolean>;
  Get(
    ENCRYPTIONKEY: string,
    collection: string,
    query: Record<string, QueryValue>,
  ): Promise<Record<string, any>[] | boolean>;
  Insert(
    ENCRYPTIONKEY: string,
    collection: string,
    item: any,
    index: any,
  ): Promise<boolean>;
  Replace(
    ENCRYPTIONKEY: string,
    collection: string,
    query: Record<string, QueryValue>,
    item: any,
    index: any,
  ): Promise<boolean>;
  Modify(
    ENCRYPTIONKEY: string,
    collection: string,
    query: Record<string, QueryValue>,
    modification: Record<string, QueryValue>,
  ): Promise<boolean>;
  Delete(
    collection: string,
    query: Record<string, QueryValue>,
  ): Promise<boolean>;
}
