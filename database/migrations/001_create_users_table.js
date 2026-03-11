import { createTable, dropTableIfExists } from '../MigrationHelper';
export async function up(db) {
    await createTable(db, 'users', (t) => {
        t.id();
        t.string('name').notNull();
        t.string('email').notNull().unique();
        t.timestamps();
    });
}
export async function down(db) {
    await dropTableIfExists(db, 'users');
}
//# sourceMappingURL=001_create_users_table.js.map