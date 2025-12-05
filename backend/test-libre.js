async function test() {
    try {
        console.log('Attempting translation with localhost...');
        const res = await fetch("http://localhost:5000/translate", {
            method: "POST",
            body: JSON.stringify({
                q: "Hello",
                source: "en",
                target: "pt-BR",
                format: "text"
            }),
            headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log('Success:', data);
    } catch (e) {
        console.log('Error Message:', e.message);
    }
}

test();
