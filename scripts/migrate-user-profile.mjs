/**
 * One-off migration: nest flat personal fields under `profile`.
 *
 * Usage (from gym-data-be, with env loaded):
 *   node --env-file=.env scripts/migrate-user-profile.mjs
 *
 * Idempotent: skips users that already have `profile.firstName`.
 */
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE;

if (!uri || !dbName) {
  console.error('Missing MONGODB_URI or MONGODB_DATABASE');
  process.exit(1);
}

await mongoose.connect(uri, { dbName });
const users = mongoose.connection.collection('users');

const filter = {
  firstName: { $exists: true },
  'profile.firstName': { $exists: false },
};

const toMigrate = await users.countDocuments(filter);
console.log(`Users to migrate: ${toMigrate}`);

if (toMigrate > 0) {
  const nestResult = await users.updateMany(filter, [
    {
      $set: {
        profile: {
          firstName: '$firstName',
          lastName: '$lastName',
          heightCm: { $ifNull: ['$heightCm', null] },
          sex: { $ifNull: ['$sex', null] },
          birthDate: { $ifNull: ['$birthDate', null] },
        },
      },
    },
  ]);
  console.log(`Nested profile on ${nestResult.modifiedCount} docs`);
}

const unsetResult = await users.updateMany(
  {
    $or: [
      { firstName: { $exists: true } },
      { lastName: { $exists: true } },
      { heightCm: { $exists: true }, 'profile.heightCm': { $exists: true } },
      { sex: { $exists: true }, 'profile.sex': { $exists: true } },
      { birthDate: { $exists: true }, 'profile.birthDate': { $exists: true } },
    ],
  },
  {
    $unset: {
      firstName: '',
      lastName: '',
      heightCm: '',
      sex: '',
      birthDate: '',
    },
  },
);
console.log(`Unset flat fields on ${unsetResult.modifiedCount} docs`);

await mongoose.disconnect();
console.log('Done');
