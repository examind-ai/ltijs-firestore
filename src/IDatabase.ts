export default interface IDatabase {
  setup(): Promise<boolean>;
  Close(): Promise<boolean>;
  Get(
    ENCRYPTIONKEY: string,
    collection: string,
    query: Record<string, string | number | boolean>,
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
    query: Record<string, string | number | boolean>,
    item: any,
    index: any,
  ): Promise<boolean>;
  Modify(
    ENCRYPTIONKEY: string,
    collection: string,
    query: Record<string, string | number | boolean>,
    modification: Record<string, string | number | boolean>,
  ): Promise<boolean>;
  Delete(
    collection: string,
    query: Record<string, string | number | boolean>,
  ): Promise<boolean>;
}
