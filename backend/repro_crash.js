const http = require('http');

// 1. First, ensure the user is in the transaction (Reset state)
// We'll just try to add them. If they are already there, it might update or duplicate (depending on current bug), 
// but we want to ensure they exist so we can trigger the crash.
// Actually, let's just try the crash payload directly. 
// If the user is NOT in the transaction, this won't crash (it will just create).
// So we need to be sure the user IS in the transaction.
// The user said the last call succeeded, so "Fake" (userId: 3ed34cd7...) should be there.

const data = JSON.stringify({
    "type": "EXPENSE",
    "amount": 500,
    "description": "Acesso pc",
    "date": "2025-11-20T20:27:32.604Z",
    "categoryName": "PC",
    "isFixed": false,
    "installmentsCount": 1,
    "isShared": true,
    "participants": [
        {
            "id": "11111111-1111-1111-1111-111111111111", // INTENTIONALLY WRONG ID
            "userId": "3ed34cd7-9a92-4b91-9a54-20b138a6d8ee", // Correct UserID for "Fake"
            "name": "Fake",
            "amount": 166.67,
            "percent": 33.33
        },
        {
            "name": "jae",
            "amount": 166.67,
            "percent": 33.33
        }
    ]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/transactions/3d7f8e56-6155-40ac-923d-887e80343d04',
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InZpbmljaW8iLCJzdWIiOiJlY2E5OWVkMS1hZTRkLTQ1YWQtODUwOS1lNTVhZmU0YjI3ZDUiLCJlbWFpbCI6InZpbmljaW9AZ21haWwuY29tIiwiaWF0IjoxNzYzNjY0NzU1LCJleHAiOjE3NjM3NTExNTV9.P-4YvRSvaXCUpNWaLq3sWn47cujmHdjzA8m2w7dMLnA',
        'Content-Length': data.length
    }
};

console.log("Sending request with WRONG participant ID...");

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log("SUCCESS");
    } else {
        console.log("FAILURE");
    }
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        // console.log(`BODY: ${chunk}`); // Comment out body to avoid noise
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
