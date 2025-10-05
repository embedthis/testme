console.log(process.env.HTTP);
if (process.env.HTTP == "http://localhost:4100") {
    console.log("✓ Print env");
} else {
    console.error("Env not right", process.env.HTTP);
    process.exit(1);
}
