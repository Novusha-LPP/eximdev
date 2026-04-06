#!/bin/bash

# Configuration
BASE_URL="http://localhost:9006/api"
COOKIE_JAR="cookies.txt"

# Users
USER_NAME="jeeya_inamdar"
USER_PASS="12345678"
HOD_NAME="punit_pandey"
HOD_PASS="1234"
ADMIN_NAME="uday_zope"
ADMIN_PASS="12345678"

echo "--- STARTING BACKEND E2E TEST ---"

# Function to Login
login() {
    local username=$1
    local password=$2
    echo "Logging in as $username..."
    curl -s -X POST "$BASE_URL/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$username\", \"password\": \"$password\"}" \
        -c $COOKIE_JAR > login_res.json
    
    if grep -q "success\":true" login_res.json; then
        echo "Login Successful."
    else
        echo "Login Failed!"
        cat login_res.json
        exit 1
    fi
}

# 1. Login as User
login $USER_NAME $USER_PASS

# 2. Get User Profile/ID
echo "Fetching User Profile..."
USER_ID=$(curl -s -X GET "$BASE_URL/attendance/profile" -b $COOKIE_JAR | grep -oP '"_id":"\K[^"]+')
echo "User ID: $USER_ID"

# 3. Get Leave Balance
echo "Fetching Leave Balance..."
curl -s -X GET "$BASE_URL/leave/balance" -b $COOKIE_JAR > balance_before.json
echo "Current Balance:"
cat balance_before.json | python3 -m json.tool | grep -A 10 "results"

# 4. Pick a Policy ID (Casual Leave)
POLICY_ID=$(cat balance_before.json | python3 -m json.tool | grep -B 2 '"leave_type": "casual"' | grep '"leave_policy_id":' | grep -oP ':[^"]*"\K[^"]+')
if [ -z "$POLICY_ID" ]; then
    POLICY_ID=$(cat balance_before.json | python3 -m json.tool | grep -oP '"leave_policy_id":"\K[^"]+' | head -n 1)
fi
echo "Selected Policy ID: $POLICY_ID"

# 5. Apply for Leave
echo "Applying for Leave (1 day)..."
curl -s -X POST "$BASE_URL/leave/apply" \
    -b $COOKIE_JAR \
    -H "Content-Type: application/json" \
    -d "{
        \"leave_policy_id\": \"$POLICY_ID\",
        \"from_date\": \"2026-05-01\",
        \"to_date\": \"2026-05-01\",
        \"reason\": \"Backend E2E Testing\",
        \"total_days\": 1
    }" > apply_res.json

APPLICATION_ID=$(grep -oP '"_id":"\K[^"]+' apply_res.json)
if [ -z "$APPLICATION_ID" ]; then
    echo "Application Failed!"
    cat apply_res.json
    exit 1
fi
echo "Application Success! ID: $APPLICATION_ID"

# 6. Login as HOD
login $HOD_NAME $HOD_PASS

# 7. Approve as HOD
echo "HOD Approving Request..."
curl -s -X POST "$BASE_URL/hod-attendance/approve-request" \
    -b $COOKIE_JAR \
    -H "Content-Type: application/json" \
    -d "{
        \"id\": \"$APPLICATION_ID\",
        \"type\": \"leave\",
        \"status\": \"approved\",
        \"comments\": \"HOD Approved via API\"
    }" > hod_res.json
cat hod_res.json

# 8. Login as Admin
login $ADMIN_NAME $ADMIN_PASS

# 9. Final Approval as Admin
echo "Admin Finalizing Approval..."
curl -s -X POST "$BASE_URL/hod-attendance/approve-request" \
    -b $COOKIE_JAR \
    -H "Content-Type: application/json" \
    -d "{
        \"id\": \"$APPLICATION_ID\",
        \"type\": \"leave\",
        \"status\": \"approved\",
        \"comments\": \"Admin Finalized via API\"
    }" > admin_approve_res.json
cat admin_approve_res.json

# 10. Update Balance with 140 days
echo "Admin Updating Balance (Opening: 140)..."
curl -s -X POST "$BASE_URL/leave/admin-update-balance/$USER_ID" \
    -b $COOKIE_JAR \
    -H "Content-Type: application/json" \
    -d "{
        \"leave_policy_id\": \"$POLICY_ID\",
        \"opening_balance\": 140,
        \"used\": 1,
        \"pending\": 0
    }" > update_balance_res.json
cat update_balance_res.json

# 11. Verify Final Balance
echo "Final Balance Check..."
curl -s -X GET "$BASE_URL/leave/balance?employee_id=$USER_ID" -b $COOKIE_JAR > final_balance.json
cat final_balance.json | python3 -m json.tool | grep -A 20 "results"

echo "--- BACKEND E2E TEST COMPLETE ---"
rm cookies.txt login_res.json balance_before.json apply_res.json hod_res.json admin_approve_res.json update_balance_res.json final_balance.json
