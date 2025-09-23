    console.log("\n🔄 Poking SHIB spot price...");
    try {
        await spot.poke(shibIlk);
        console.log("✅ SHIB spot price poked");
    } catch (error) {
        console.log("⚠️ SHIB poke failed (price feed might be invalid):", error.message);
    }

    // Check updated spot price
    try {
        const finalIlk = await spot.ilks(shibIlk);
        console.log("📊 SHIB-A spot price:", finalIlk.spot.toString());
    } catch (error) {
        console.log("⚠️ Could not read final spot price:", error.message);
    }

    console.log("\n🎉 SHIB price feed fix attempted!");
    console.log("✅ SHIB/USD feed address updated");
    console.log("⚠️ Price feed may need verification");