import { DB } from '@gravito/atlas';
export default async function seed() {
    const users = [
        {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Admin User',
            email: 'admin@example.com',
            created_at: new Date().toISOString(),
        },
        {
            id: '00000000-0000-0000-0000-000000000002',
            name: 'Test User',
            email: 'test@example.com',
            created_at: new Date().toISOString(),
        },
    ];
    for (const user of users) {
        await DB.table('users').insert(user);
    }
    console.log('UserSeeder: Seeding complete (2 users inserted)');
}
//# sourceMappingURL=UserSeeder.js.map