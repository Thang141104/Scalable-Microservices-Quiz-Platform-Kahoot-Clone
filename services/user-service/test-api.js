/**
 * Automated API Test Script for User Service
 * Run: node test-api.js
 */

const axios = require('axios');

const USER_SERVICE_URL = 'http://localhost:3004';
const AUTH_SERVICE_URL = 'http://localhost:3001'; // Auth routes at root level

// Test data
const testUser = {
  username: `testuser_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'Test123456!'
};

let userId = null;
let jwtToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Register User
async function testRegister() {
  try {
    log('\n Test 1: Register User', 'blue');
    const response = await axios.post(`${AUTH_SERVICE_URL}/register`, testUser);
    
    if (response.data.success) {
      userId = response.data.userId;
      log(` User registered successfully! UserId: ${userId}`, 'green');
      return true;
    } else {
      log(` Registration failed: ${response.data.message}`, 'red');
      return false;
    }
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 2: Get Profile (should not exist yet)
async function testGetProfileBeforeVerify() {
  try {
    log('\n Test 2: Get Profile Before Verification', 'blue');
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/profile`);
    
    log(` Profile should not exist yet!`, 'red');
    return false;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      log(` Profile correctly not found (expected)`, 'green');
      return true;
    }
    log(` Unexpected error: ${error.message}`, 'red');
    return false;
  }
}

// Test 3: Verify OTP (mock - you'll need actual OTP from email/database)
async function testVerifyOTP() {
  try {
    log('\n  Test 3: Verify OTP (Skipped - requires manual OTP)', 'yellow');
    log('  Please verify OTP manually and update userId in this script', 'yellow');
    
    // For testing, you can manually set a verified userId here
    // userId = 'YOUR_VERIFIED_USER_ID';
    // jwtToken = 'YOUR_JWT_TOKEN';
    
    return false; // Skip for now
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 4: Create Profile Manually (for testing without OTP)
async function testCreateProfile() {
  try {
    log('\n Test 4: Create Profile', 'blue');
    const response = await axios.post(
      `${USER_SERVICE_URL}/api/users/${userId}/profile`,
      {
        username: testUser.username,
        email: testUser.email,
        displayName: `Test User ${Date.now()}`,
        bio: 'This is a test bio'
      }
    );
    
    if (response.status === 201) {
      log(` Profile created successfully!`, 'green');
      log(`   DisplayName: ${response.data.profile.displayName}`, 'green');
      return true;
    }
  } catch (error) {
    if (error.response) {
      log(` Error: ${error.response.data.message}`, 'red');
    } else {
      log(` Error: ${error.message}`, 'red');
    }
    return false;
  }
}

// Test 5: Get Profile (should exist now)
async function testGetProfile() {
  try {
    log('\n Test 5: Get Profile', 'blue');
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/profile`);
    
    if (response.status === 200) {
      const profile = response.data;
      log(` Profile retrieved successfully!`, 'green');
      log(`   Username: ${profile.username}`, 'green');
      log(`   Display Name: ${profile.displayName}`, 'green');
      log(`   Level: ${profile.level}`, 'green');
      log(`   Experience: ${profile.experience}`, 'green');
      return true;
    }
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 6: Get User Statistics
async function testGetStats() {
  try {
    log('\n Test 6: Get User Statistics', 'blue');
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/stats`);
    
    if (response.status === 200) {
      const data = response.data;
      log(` Stats retrieved successfully!`, 'green');
      log(`   Username: ${data.username}`, 'green');
      log(`   Level: ${data.level}`, 'green');
      log(`   Experience: ${data.experience}`, 'green');
      if (data.stats) {
        log(`   Quizzes Created: ${data.stats.quizzesCreated || 0}`, 'green');
        log(`   Games Played: ${data.stats.gamesPlayed || 0}`, 'green');
        log(`   Total Points: ${data.stats.totalPoints || 0}`, 'green');
      }
      return true;
    }
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 7: Get Achievements
async function testGetAchievements() {
  try {
    log('\n Test 7: Get User Achievements', 'blue');
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/achievements`);
    
    if (response.status === 200) {
      const data = response.data;
      const achievements = data.achievements || [];
      log(` Achievements retrieved successfully!`, 'green');
      log(`   Total Achievements: ${data.totalCount || achievements.length}`, 'green');
      log(`   Unlocked: ${data.unlockedCount || 0}`, 'green');
      
      const unlocked = achievements.filter(a => a.unlocked);
      
      if (unlocked.length > 0) {
        log(`\n   Unlocked Achievements:`, 'green');
        unlocked.forEach(a => {
          log(`   - ${a.icon} ${a.name}: ${a.description}`, 'green');
        });
      }
      return true;
    }
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 8: Get All Achievement Definitions
async function testGetAllAchievements() {
  try {
    log('\n Test 8: Get All Achievement Definitions', 'blue');
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/achievements/catalog`);
    
    if (response.status === 200) {
      const data = response.data;
      const achievements = data.achievements || [];
      log(` Achievement definitions retrieved!`, 'green');
      log(`   Total Available: ${data.count || achievements.length}`, 'green');
      
      // Group by category
      const byCategory = achievements.reduce((acc, a) => {
        acc[a.category] = (acc[a.category] || 0) + 1;
        return acc;
      }, {});
      
      log(`\n   By Category:`, 'green');
      Object.entries(byCategory).forEach(([cat, count]) => {
        log(`   - ${cat}: ${count}`, 'green');
      });
      return true;
    }
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 9: Get User Preferences
async function testGetPreferences() {
  try {
    log('\n  Test 9: Get User Preferences', 'blue');
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/${userId}/preferences`);
    
    if (response.status === 200) {
      const data = response.data;
      const prefs = data.preferences || {};
      log(` Preferences retrieved successfully!`, 'green');
      log(`   Theme: ${prefs.theme || 'light'}`, 'green');
      log(`   Language: ${prefs.language || 'en'}`, 'green');
      log(`   Notifications: ${prefs.notifications?.email ? 'Enabled' : 'Disabled'}`, 'green');
      return true;
    }
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 10: Search Users
async function testSearchUsers() {
  try {
    log('\n Test 10: Search Users', 'blue');
    const searchTerm = testUser.username.substring(0, 8);
    const response = await axios.get(
      `${USER_SERVICE_URL}/api/users/search?q=${searchTerm}`
    );
    
    if (response.status === 200) {
      const data = response.data;
      const users = data.results || [];
      log(` Search completed successfully!`, 'green');
      log(`   Query: "${data.query}"`, 'green');
      log(`   Found: ${data.count || users.length} users`, 'green');
      if (users.length > 0) {
        log(`   First result: ${users[0].displayName} (${users[0].username})`, 'green');
      }
      return true;
    }
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Test 11: Get Leaderboard
async function testGetLeaderboard() {
  try {
    log('\n Test 11: Get Leaderboard', 'blue');
    const response = await axios.get(`${USER_SERVICE_URL}/api/users/leaderboard?limit=5`);
    
    if (response.status === 200) {
      const data = response.data;
      const leaderboard = data.leaderboard || [];
      log(` Leaderboard retrieved successfully!`, 'green');
      log(`   Top ${data.count || leaderboard.length} players (sorted by ${data.sortBy || 'experience'}):`, 'green');
      
      leaderboard.forEach((user, index) => {
        log(`   ${index + 1}. ${user.displayName} - ${user.stats.totalPoints} points`, 'green');
      });
      return true;
    }
  } catch (error) {
    log(` Error: ${error.message}`, 'red');
    return false;
  }
}

// Main test runner
async function runTests() {
  log('='.repeat(60), 'blue');
  log(' User Service API Tests', 'blue');
  log('='.repeat(60), 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  // Run tests
  if (await testRegister()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testGetProfileBeforeVerify()) results.passed++; else results.failed++;
  await sleep(1000);
  
  // Skip OTP verification in automated test
  results.skipped++;
  
  if (await testCreateProfile()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testGetProfile()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testGetStats()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testGetAchievements()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testGetAllAchievements()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testGetPreferences()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testSearchUsers()) results.passed++; else results.failed++;
  await sleep(1000);
  
  if (await testGetLeaderboard()) results.passed++; else results.failed++;
  
  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log(' Test Summary', 'blue');
  log('='.repeat(60), 'blue');
  log(` Passed: ${results.passed}`, 'green');
  log(` Failed: ${results.failed}`, 'red');
  log(` Skipped: ${results.skipped}`, 'yellow');
  log(` Total: ${results.passed + results.failed + results.skipped}`, 'blue');
  log('='.repeat(60), 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\n Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
