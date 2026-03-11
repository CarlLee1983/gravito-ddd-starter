/**
 * Laravel 風格的 schema builder
 *
 * 提供流暢的 API 來定義表結構，最終轉為 SQL 語句。
 * 支援常見的欄位型別、索引、約束等。
 */
export interface IColumnBuilder {
    notNull(): this;
    unique(): this;
    default(value: string | number | boolean | null): this;
    references(table: string): this;
    on(table: string): this;
    onDelete(action: 'cascade' | 'restrict' | 'set null'): this;
    onUpdate(action: 'cascade' | 'restrict' | 'set null'): this;
    collate(collation: string): this;
}
export declare class ColumnBuilder implements IColumnBuilder {
    private name;
    private _type;
    private _nullable;
    private _unique;
    private _default;
    private _foreignKey;
    private _onDelete;
    private _onUpdate;
    private _collate;
    constructor(name: string, type: string);
    notNull(): this;
    unique(): this;
    default(value: string | number | boolean | null): this;
    references(column: string): this;
    on(table: string): this;
    onDelete(action: 'cascade' | 'restrict' | 'set null'): this;
    onUpdate(action: 'cascade' | 'restrict' | 'set null'): this;
    collate(collation: string): this;
    toSQL(): string;
    getForeignKeyConstraint(): string | null;
}
export interface ITableBuilder {
    id(): ColumnBuilder;
    string(name: string, length?: number): ColumnBuilder;
    text(name: string): ColumnBuilder;
    integer(name: string): ColumnBuilder;
    bigInteger(name: string): ColumnBuilder;
    float(name: string, precision?: number, scale?: number): ColumnBuilder;
    decimal(name: string, precision?: number, scale?: number): ColumnBuilder;
    boolean(name: string): ColumnBuilder;
    date(name: string): ColumnBuilder;
    dateTime(name: string): ColumnBuilder;
    timestamp(name: string): ColumnBuilder;
    timestamps(): void;
    softDeletes(): void;
    json(name: string): ColumnBuilder;
    uuid(name: string): ColumnBuilder;
    nullable(column: ColumnBuilder): ColumnBuilder;
    primary(columns: string[]): void;
    unique(columns: string[]): void;
    index(columns: string[]): void;
}
export declare class TableBuilder implements ITableBuilder {
    private tableName;
    private columns;
    private primaryKeys;
    private uniqueConstraints;
    private indexConstraints;
    constructor(tableName: string);
    id(): ColumnBuilder;
    string(name: string, length?: number): ColumnBuilder;
    text(name: string): ColumnBuilder;
    integer(name: string): ColumnBuilder;
    bigInteger(name: string): ColumnBuilder;
    float(name: string, precision?: number, scale?: number): ColumnBuilder;
    decimal(name: string, precision?: number, scale?: number): ColumnBuilder;
    boolean(name: string): ColumnBuilder;
    date(name: string): ColumnBuilder;
    dateTime(name: string): ColumnBuilder;
    timestamp(name: string): ColumnBuilder;
    timestamps(): void;
    softDeletes(): void;
    json(name: string): ColumnBuilder;
    uuid(name: string): ColumnBuilder;
    nullable(column: ColumnBuilder): ColumnBuilder;
    primary(columns: string[]): void;
    unique(columns: string[]): void;
    index(columns: string[]): void;
    toSQL(): string;
}
export interface ISchemaBuilder {
    create(table: string, callback: (table: ITableBuilder) => void): TableBuilder;
    drop(table: string): string;
    dropIfExists(table: string): string;
}
export declare class SchemaBuilder implements ISchemaBuilder {
    create(table: string, callback: (table: ITableBuilder) => void): TableBuilder;
    drop(table: string): string;
    dropIfExists(table: string): string;
}
/**
 * 便利工廠函數
 */
export declare function schema(): ISchemaBuilder;
//# sourceMappingURL=SchemaBuilder.d.ts.map