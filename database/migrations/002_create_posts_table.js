import { createTable, dropTableIfExists } from '../MigrationHelper';
export async function up(db) {
    await createTable(db, 'posts', (t) => {
        t.id();
        t.string('name').notNull();
        t.timestamps();
    });
}
export async function down(db) {
    await dropTableIfExists(db, 'posts');
}
//# sourceMappingURL=002_create_posts_table.js.map