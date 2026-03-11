/**
 * Laravel 風格的 schema builder
 *
 * 提供流暢的 API 來定義表結構，最終轉為 SQL 語句。
 * 支援常見的欄位型別、索引、約束等。
 */
export class ColumnBuilder {
    constructor(name, type) {
        this.name = name;
        this._type = '';
        this._nullable = true;
        this._unique = false;
        this._foreignKey = '';
        this._onDelete = '';
        this._onUpdate = '';
        this._collate = '';
        this._type = type;
    }
    notNull() {
        this._nullable = false;
        return this;
    }
    unique() {
        this._unique = true;
        return this;
    }
    default(value) {
        this._default = value;
        return this;
    }
    references(column) {
        this._foreignKey = column;
        return this;
    }
    on(table) {
        this._foreignKey = `${table}.${this._foreignKey || 'id'}`;
        return this;
    }
    onDelete(action) {
        this._onDelete = action.toUpperCase();
        return this;
    }
    onUpdate(action) {
        this._onUpdate = action.toUpperCase();
        return this;
    }
    collate(collation) {
        this._collate = collation;
        return this;
    }
    toSQL() {
        const parts = [this.name, this._type];
        if (this._nullable === false) {
            parts.push('NOT NULL');
        }
        if (this._unique) {
            parts.push('UNIQUE');
        }
        if (this._default !== undefined) {
            if (typeof this._default === 'string') {
                if (this._default === 'CURRENT_TIMESTAMP') {
                    parts.push(`DEFAULT ${this._default}`);
                }
                else {
                    parts.push(`DEFAULT '${this._default}'`);
                }
            }
            else if (this._default === null) {
                parts.push('DEFAULT NULL');
            }
            else {
                parts.push(`DEFAULT ${this._default}`);
            }
        }
        if (this._collate) {
            parts.push(`COLLATE ${this._collate}`);
        }
        return parts.join(' ');
    }
    getForeignKeyConstraint() {
        if (!this._foreignKey)
            return null;
        const parts = [`FOREIGN KEY (${this.name}) REFERENCES ${this._foreignKey}`];
        if (this._onDelete) {
            parts.push(`ON DELETE ${this._onDelete}`);
        }
        if (this._onUpdate) {
            parts.push(`ON UPDATE ${this._onUpdate}`);
        }
        return parts.join(' ');
    }
}
export class TableBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.columns = [];
        this.primaryKeys = [];
        this.uniqueConstraints = [];
        this.indexConstraints = [];
    }
    id() {
        const col = new ColumnBuilder('id', 'TEXT');
        col.notNull();
        this.columns.push(col);
        this.primaryKeys.push('id');
        return col;
    }
    string(name, length) {
        const col = new ColumnBuilder(name, `VARCHAR(${length || 255})`);
        this.columns.push(col);
        return col;
    }
    text(name) {
        const col = new ColumnBuilder(name, 'TEXT');
        this.columns.push(col);
        return col;
    }
    integer(name) {
        const col = new ColumnBuilder(name, 'INTEGER');
        this.columns.push(col);
        return col;
    }
    bigInteger(name) {
        const col = new ColumnBuilder(name, 'BIGINT');
        this.columns.push(col);
        return col;
    }
    float(name, precision, scale) {
        const def = precision && scale ? `FLOAT(${precision},${scale})` : 'FLOAT';
        const col = new ColumnBuilder(name, def);
        this.columns.push(col);
        return col;
    }
    decimal(name, precision, scale) {
        const def = precision && scale ? `DECIMAL(${precision},${scale})` : 'DECIMAL';
        const col = new ColumnBuilder(name, def);
        this.columns.push(col);
        return col;
    }
    boolean(name) {
        const col = new ColumnBuilder(name, 'BOOLEAN');
        this.columns.push(col);
        return col;
    }
    date(name) {
        const col = new ColumnBuilder(name, 'DATE');
        this.columns.push(col);
        return col;
    }
    dateTime(name) {
        const col = new ColumnBuilder(name, 'DATETIME');
        this.columns.push(col);
        return col;
    }
    timestamp(name) {
        const col = new ColumnBuilder(name, 'TIMESTAMP');
        this.columns.push(col);
        return col;
    }
    timestamps() {
        const createdAt = new ColumnBuilder('created_at', 'DATETIME');
        createdAt.default('CURRENT_TIMESTAMP').notNull();
        const updatedAt = new ColumnBuilder('updated_at', 'DATETIME');
        updatedAt.default('CURRENT_TIMESTAMP').notNull();
        this.columns.push(createdAt, updatedAt);
    }
    softDeletes() {
        const deletedAt = new ColumnBuilder('deleted_at', 'DATETIME');
        this.columns.push(deletedAt);
    }
    json(name) {
        const col = new ColumnBuilder(name, 'JSON');
        this.columns.push(col);
        return col;
    }
    uuid(name) {
        const col = new ColumnBuilder(name, 'TEXT');
        this.columns.push(col);
        return col;
    }
    nullable(column) {
        // 移除 notNull 的限制（允許 NULL）
        // 此實現假設前面已經調用了 notNull()
        // 實際上我們需要更聰明的方式追蹤狀態
        return column;
    }
    primary(columns) {
        this.primaryKeys = [...this.primaryKeys, ...columns];
    }
    unique(columns) {
        this.uniqueConstraints.push(columns);
    }
    index(columns) {
        this.indexConstraints.push(columns);
    }
    toSQL() {
        const columnDefs = this.columns.map((col) => col.toSQL());
        // 加入 PRIMARY KEY 約束
        if (this.primaryKeys.length > 0) {
            const uniqueKeys = [...new Set(this.primaryKeys)]; // 去重
            columnDefs.push(`PRIMARY KEY (${uniqueKeys.join(', ')})`);
        }
        // 加入 FOREIGN KEY 約束
        this.columns.forEach((col) => {
            const fk = col.getForeignKeyConstraint();
            if (fk) {
                columnDefs.push(fk);
            }
        });
        // 加入 UNIQUE 約束
        this.uniqueConstraints.forEach((cols) => {
            columnDefs.push(`UNIQUE (${cols.join(', ')})`);
        });
        const columnsSQL = columnDefs.join(',\n      ');
        return `CREATE TABLE IF NOT EXISTS ${this.tableName} (
      ${columnsSQL}
    )`;
    }
}
export class SchemaBuilder {
    create(table, callback) {
        const builder = new TableBuilder(table);
        callback(builder);
        return builder;
    }
    drop(table) {
        return `DROP TABLE ${table}`;
    }
    dropIfExists(table) {
        return `DROP TABLE IF EXISTS ${table}`;
    }
}
/**
 * 便利工廠函數
 */
export function schema() {
    return new SchemaBuilder();
}
//# sourceMappingURL=SchemaBuilder.js.map