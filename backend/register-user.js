const http = require('http');

const data = JSON.stringify({
    name: "Vinicio Salazar Barbosa",
    username: "Vinicio",
    email: "vinicio@gmail.com",
    password: "Vini123321",
    confirmPassword: "Vini123321"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();
