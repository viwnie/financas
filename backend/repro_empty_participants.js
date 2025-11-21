const http = require('http');

const data = JSON.stringify({
    "type": "EXPENSE",
    "amount": 500,
    "description": "Acesso pc",
    "date": "2025-11-20T20:27:32.604Z",
    "categoryName": "PC",
    "isFixed": false,
    "installmentsCount": 1,
    "isShared": true,
    "participants": []
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

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
