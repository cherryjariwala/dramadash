import fetch from 'node-fetch';

async function test() {
    try {
        console.log("🔍 Testing /debug...");
        const resDebug = await fetch("http://localhost:4000/debug");
        const text = await resDebug.text();
        console.log("✅ Debug Response Text:", text.slice(0, 100));

        console.log("\n🔍 Testing /User/index.html...");
        const resIndex = await fetch("http://localhost:4000/User/index.html");
        console.log("✅ Index Status:", resIndex.status);
        if (resIndex.status === 200) {
            console.log("🚀 SUCCESS: File served correctly!");
        } else {
            console.log("❌ FAILURE: Still getting 404!");
        }

    } catch (err) {
        console.error("❌ Test Failed:", err.message);
    }
}

test();
