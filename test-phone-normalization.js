// Test script to verify phone number normalization
// Run this in browser console to test the normalization

function testPhoneNormalization() {
  const normalizePhone = (phone) => {
    // Remove spaces, dashes, parentheses, and other formatting
    return phone.replace(/[\s\-\(\)\.]/g, '');
  };

  const testCases = [
    "+20 1092201107",  // User's phone from database
    "+201092201107",   // Expected Firebase Auth format
    "+20-109-220-1107", // With dashes
    "+20 (109) 220-1107", // With parentheses
    "20 1092201107",   // Without + prefix
    "201092201107",    // Just digits
  ];

  console.log("Testing phone number normalization:");
  testCases.forEach(phone => {
    const normalized = normalizePhone(phone);
    console.log(`"${phone}" -> "${normalized}"`);
  });

  // Test the specific user's phone
  const userPhone = "+20 1092201107";
  const firebasePhone = "+201092201107";
  
  console.log("\nTesting user's specific case:");
  console.log(`Database phone: "${userPhone}" -> "${normalizePhone(userPhone)}"`);
  console.log(`Firebase phone: "${firebasePhone}" -> "${normalizePhone(firebasePhone)}"`);
  console.log(`Match: ${normalizePhone(userPhone) === normalizePhone(firebasePhone)}`);
}

// Run the test
testPhoneNormalization();
