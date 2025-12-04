const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Football Prediction Market contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy Mock POL Token first
  console.log("\n1. Deploying Mock POL Token...");
  const MockPOLToken = await ethers.getContractFactory("MockPOLToken");
  const polToken = await MockPOLToken.deploy();
  await polToken.deployed();
  console.log("Mock POL Token deployed to:", polToken.address);

  // Deploy Football Prediction Market
  console.log("\n2. Deploying Football Prediction Market...");
  const FootballPredictionMarket = await ethers.getContractFactory("FootballPredictionMarket");
  const predictionMarket = await FootballPredictionMarket.deploy(polToken.address);
  await predictionMarket.deployed();
  console.log("Football Prediction Market deployed to:", predictionMarket.address);

  // Mint some test tokens to deployer
  console.log("\n3. Minting test POL tokens...");
  const mintAmount = ethers.utils.parseEther("10000"); // 10,000 POL
  await polToken.mint(deployer.address, mintAmount);
  console.log("Minted 10,000 POL tokens to deployer");

  // Create a sample match for testing
  console.log("\n4. Creating sample match...");
  const now = Math.floor(Date.now() / 1000);
  const matchStartTime = now + 3600; // 1 hour from now
  
  await predictionMarket.createMatch(
    "Manchester United",
    "Liverpool",
    matchStartTime,
    2500, // 2.5x odds for home win
    3200, // 3.2x odds for draw
    2800  // 2.8x odds for away win
  );
  console.log("Created sample match: Manchester United vs Liverpool");

  console.log("\n✅ Deployment completed!");
  console.log("\nContract Addresses:");
  console.log("==================");
  console.log("Mock POL Token:", polToken.address);
  console.log("Football Prediction Market:", predictionMarket.address);
  
  console.log("\nNext Steps:");
  console.log("===========");
  console.log("1. Update frontend with contract addresses");
  console.log("2. Test betting functionality");
  console.log("3. Integrate with football API for real match data");
  console.log("4. Deploy to Polygon mainnet when ready");

  // Save deployment info
  const deploymentInfo = {
    network: "localhost",
    polToken: polToken.address,
    predictionMarket: predictionMarket.address,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync('deployment.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\n📄 Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




