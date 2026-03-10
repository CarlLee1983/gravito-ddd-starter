/**
 * Laravel 風格的 schema builder
 *
 * 提供流暢的 API 來定義表結構，最終轉為 SQL 語句。
 * 支援常見的欄位型別、索引、約束等。
 */

export interface IColumnBuilder {
	notNull(): this
	unique(): this
	default(value: string | number | boolean | null): this
	references(table: string): this
	on(table: string): this
	onDelete(action: 'cascade' | 'restrict' | 'set null'): this
	onUpdate(action: 'cascade' | 'restrict' | 'set null'): this
	collate(collation: string): this
}

export class ColumnBuilder implements IColumnBuilder {
	private _type = ''
	private _nullable = true
	private _unique = false
	private _default: string | number | boolean | null | undefined
	private _foreignKey = ''
	private _onDelete = ''
	private _onUpdate = ''
	private _collate = ''

	constructor(private name: string, type: string) {
		this._type = type
	}

	notNull(): this {
		this._nullable = false
		return this
	}

	unique(): this {
		this._unique = true
		return this
	}

	default(value: string | number | boolean | null): this {
		this._default = value
		return this
	}

	references(column: string): this {
		this._foreignKey = column
		return this
	}

	on(table: string): this {
		this._foreignKey = `${table}.${this._foreignKey || 'id'}`
		return this
	}

	onDelete(action: 'cascade' | 'restrict' | 'set null'): this {
		this._onDelete = action.toUpperCase()
		return this
	}

	onUpdate(action: 'cascade' | 'restrict' | 'set null'): this {
		this._onUpdate = action.toUpperCase()
		return this
	}

	collate(collation: string): this {
		this._collate = collation
		return this
	}

	toSQL(): string {
		const parts: string[] = [this.name, this._type]

		if (this._nullable === false) {
			parts.push('NOT NULL')
		}

		if (this._unique) {
			parts.push('UNIQUE')
		}

		if (this._default !== undefined) {
			if (typeof this._default === 'string') {
				if (this._default === 'CURRENT_TIMESTAMP') {
					parts.push(`DEFAULT ${this._default}`)
				} else {
					parts.push(`DEFAULT '${this._default}'`)
				}
			} else if (this._default === null) {
				parts.push('DEFAULT NULL')
			} else {
				parts.push(`DEFAULT ${this._default}`)
			}
		}

		if (this._collate) {
			parts.push(`COLLATE ${this._collate}`)
		}

		return parts.join(' ')
	}

	getForeignKeyConstraint(): string | null {
		if (!this._foreignKey) return null

		const parts: string[] = [`FOREIGN KEY (${this.name}) REFERENCES ${this._foreignKey}`]

		if (this._onDelete) {
			parts.push(`ON DELETE ${this._onDelete}`)
		}

		if (this._onUpdate) {
			parts.push(`ON UPDATE ${this._onUpdate}`)
		}

		return parts.join(' ')
	}
}

export interface ITableBuilder {
	id(): ColumnBuilder
	string(name: string, length?: number): ColumnBuilder
	text(name: string): ColumnBuilder
	integer(name: string): ColumnBuilder
	bigInteger(name: string): ColumnBuilder
	float(name: string, precision?: number, scale?: number): ColumnBuilder
	decimal(name: string, precision?: number, scale?: number): ColumnBuilder
	boolean(name: string): ColumnBuilder
	date(name: string): ColumnBuilder
	dateTime(name: string): ColumnBuilder
	timestamp(name: string): ColumnBuilder
	timestamps(): void
	softDeletes(): void
	json(name: string): ColumnBuilder
	uuid(name: string): ColumnBuilder
	nullable(column: ColumnBuilder): ColumnBuilder
	primary(columns: string[]): void
	unique(columns: string[]): void
	index(columns: string[]): void
}

export class TableBuilder implements ITableBuilder {
	private columns: ColumnBuilder[] = []
	private primaryKeys: string[] = []
	private uniqueConstraints: string[][] = []
	private indexConstraints: string[][] = []

	constructor(private tableName: string) {}

	id(): ColumnBuilder {
		const col = new ColumnBuilder('id', 'TEXT')
		col.notNull()
		this.columns.push(col)
		this.primaryKeys.push('id')
		return col
	}

	string(name: string, length?: number): ColumnBuilder {
		const col = new ColumnBuilder(name, `VARCHAR(${length || 255})`)
		this.columns.push(col)
		return col
	}

	text(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'TEXT')
		this.columns.push(col)
		return col
	}

	integer(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'INTEGER')
		this.columns.push(col)
		return col
	}

	bigInteger(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'BIGINT')
		this.columns.push(col)
		return col
	}

	float(name: string, precision?: number, scale?: number): ColumnBuilder {
		const def = precision && scale ? `FLOAT(${precision},${scale})` : 'FLOAT'
		const col = new ColumnBuilder(name, def)
		this.columns.push(col)
		return col
	}

	decimal(name: string, precision?: number, scale?: number): ColumnBuilder {
		const def = precision && scale ? `DECIMAL(${precision},${scale})` : 'DECIMAL'
		const col = new ColumnBuilder(name, def)
		this.columns.push(col)
		return col
	}

	boolean(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'BOOLEAN')
		this.columns.push(col)
		return col
	}

	date(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'DATE')
		this.columns.push(col)
		return col
	}

	dateTime(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'DATETIME')
		this.columns.push(col)
		return col
	}

	timestamp(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'TIMESTAMP')
		this.columns.push(col)
		return col
	}

	timestamps(): void {
		const createdAt = new ColumnBuilder('created_at', 'DATETIME')
		createdAt.default('CURRENT_TIMESTAMP').notNull()

		const updatedAt = new ColumnBuilder('updated_at', 'DATETIME')
		updatedAt.default('CURRENT_TIMESTAMP').notNull()

		this.columns.push(createdAt, updatedAt)
	}

	softDeletes(): void {
		const deletedAt = new ColumnBuilder('deleted_at', 'DATETIME')
		this.columns.push(deletedAt)
	}

	json(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'JSON')
		this.columns.push(col)
		return col
	}

	uuid(name: string): ColumnBuilder {
		const col = new ColumnBuilder(name, 'TEXT')
		this.columns.push(col)
		return col
	}

	nullable(column: ColumnBuilder): ColumnBuilder {
		// 移除 notNull 的限制（允許 NULL）
		// 此實現假設前面已經調用了 notNull()
		// 實際上我們需要更聰明的方式追蹤狀態
		return column
	}

	primary(columns: string[]): void {
		this.primaryKeys = [...this.primaryKeys, ...columns]
	}

	unique(columns: string[]): void {
		this.uniqueConstraints.push(columns)
	}

	index(columns: string[]): void {
		this.indexConstraints.push(columns)
	}

	toSQL(): string {
		const columnDefs = this.columns.map((col) => col.toSQL())

		// 加入 PRIMARY KEY 約束
		if (this.primaryKeys.length > 0) {
			const uniqueKeys = [...new Set(this.primaryKeys)] // 去重
			columnDefs.push(`PRIMARY KEY (${uniqueKeys.join(', ')})`)
		}

		// 加入 FOREIGN KEY 約束
		this.columns.forEach((col) => {
			const fk = col.getForeignKeyConstraint()
			if (fk) {
				columnDefs.push(fk)
			}
		})

		// 加入 UNIQUE 約束
		this.uniqueConstraints.forEach((cols) => {
			columnDefs.push(`UNIQUE (${cols.join(', ')})`)
		})

		const columnsSQL = columnDefs.join(',\n      ')

		return `CREATE TABLE IF NOT EXISTS ${this.tableName} (
      ${columnsSQL}
    )`
	}
}

export interface ISchemaBuilder {
	create(
		table: string,
		callback: (table: ITableBuilder) => void,
	): TableBuilder

	drop(table: string): string
	dropIfExists(table: string): string
}

export class SchemaBuilder implements ISchemaBuilder {
	create(table: string, callback: (table: ITableBuilder) => void): TableBuilder {
		const builder = new TableBuilder(table)
		callback(builder)
		return builder
	}

	drop(table: string): string {
		return `DROP TABLE ${table}`
	}

	dropIfExists(table: string): string {
		return `DROP TABLE IF EXISTS ${table}`
	}
}

/**
 * 便利工廠函數
 */
export function schema(): ISchemaBuilder {
	return new SchemaBuilder()
}
