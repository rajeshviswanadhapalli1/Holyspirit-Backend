const mongoose = require('mongoose');
const PromiseModel = require('./models/promisemodal');
require('dotenv').config();

async function testPromiseSaving() {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Database connected');

    // Test 1: Check if we can save a single promise
    console.log('\n🧪 Test 1: Saving a single promise...');
    const testPromise = new PromiseModel({
      day: 1,
      date: '2025-01-01',
      english: 'Test promise for day 1',
      telugu: 'పరీక్ష వాగ్దానం'
    });

    await testPromise.save();
    console.log('✅ Single promise saved successfully');

    // Test 2: Check if we can retrieve it
    console.log('\n🧪 Test 2: Retrieving the saved promise...');
    const retrieved = await PromiseModel.findOne({ day: 1 });
    console.log('✅ Retrieved promise:', retrieved);

    // Test 3: Check if we can save multiple promises
    console.log('\n🧪 Test 3: Saving multiple promises...');
    const multiplePromises = [
      { day: 2, date: '2025-01-02', english: 'Test promise for day 2', telugu: '' },
      { day: 3, date: '2025-01-03', english: 'Test promise for day 3', telugu: '' },
      { day: 4, date: '2025-01-04', english: 'Test promise for day 4', telugu: '' }
    ];

    const insertResult = await PromiseModel.insertMany(multiplePromises);
    console.log('✅ Multiple promises saved:', insertResult.length);

    // Test 4: Check total count
    console.log('\n🧪 Test 4: Checking total count...');
    const totalCount = await PromiseModel.countDocuments();
    console.log('✅ Total promises in database:', totalCount);

    // Test 5: Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await PromiseModel.deleteMany({ day: { $in: [1, 2, 3, 4] } });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Your database connection and model are working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Run the test
testPromiseSaving(); 