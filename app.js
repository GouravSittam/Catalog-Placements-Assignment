const fs = require('fs');

// ============================================================================
// BASE DECODING FUNCTIONS
// ============================================================================

/**
 * Convert a string from any base to decimal (BigInt)
 * Supports bases 2-36 (0-9, a-z)
 */
function decodeFromBase(value, base) {
    const baseNum = parseInt(base);
    
    // Handle hexadecimal and other bases with letters
    if (baseNum === 16) {
        return BigInt('0x' + value);
    }
    
    // For other bases, convert manually
    let result = BigInt(0);
    const digits = value.toLowerCase().split('');
    
    for (let i = 0; i < digits.length; i++) {
        const digit = digits[i];
        let digitValue;
        
        if (digit >= '0' && digit <= '9') {
            digitValue = parseInt(digit);
        } else if (digit >= 'a' && digit <= 'z') {
            digitValue = digit.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
        } else {
            throw new Error(`Invalid digit '${digit}' for base ${base}`);
        }
        
        if (digitValue >= baseNum) {
            throw new Error(`Digit '${digit}' is invalid for base ${base}`);
        }
        
        result = result * BigInt(baseNum) + BigInt(digitValue);
    }
    
    return result;
}

// ============================================================================
// POLYNOMIAL INTERPOLATION FUNCTIONS
// ============================================================================

/**
 * Perform Lagrange interpolation to find polynomial coefficients
 * Returns array of coefficients [a0, a1, a2, ..., an] where:
 * f(x) = a0 + a1*x + a2*x^2 + ... + an*x^n
 * The constant term c is at index 0
 */
function performLagrangeInterpolation(dataPoints) {
    const numberOfPoints = dataPoints.length;
    const polynomialCoefficients = new Array(numberOfPoints).fill(BigInt(0));
    
    // For each data point, calculate its contribution to the polynomial
    for (let i = 0; i < numberOfPoints; i++) {
        const { x: xi, y: yi } = dataPoints[i];
        const xiBigInt = BigInt(xi);
        const yiBigInt = BigInt(yi);
        
        // Calculate Lagrange basis polynomial coefficients
        let basisPolynomial = new Array(numberOfPoints).fill(BigInt(0));
        basisPolynomial[0] = BigInt(1); // Start with constant term
        let denominator = BigInt(1);
        
        // Build the basis polynomial: product of (x - xj) for all j ≠ i
        for (let j = 0; j < numberOfPoints; j++) {
            if (i !== j) {
                const xjBigInt = BigInt(dataPoints[j].x);
                denominator *= (xiBigInt - xjBigInt);
                
                // Multiply current polynomial by (x - xj)
                const tempPolynomial = new Array(numberOfPoints).fill(BigInt(0));
                for (let k = 0; k < numberOfPoints - 1; k++) {
                    tempPolynomial[k + 1] = basisPolynomial[k];     // x term
                    tempPolynomial[k] = basisPolynomial[k] * (-xjBigInt); // constant term
                }
                basisPolynomial = tempPolynomial;
            }
        }
        
        // Add this basis polynomial's contribution to final coefficients
        for (let k = 0; k < numberOfPoints; k++) {
            polynomialCoefficients[k] += (yiBigInt * basisPolynomial[k]) / denominator;
        }
    }
    
    return polynomialCoefficients;
}

// ============================================================================
// COMBINATORICS FUNCTIONS
// ============================================================================

/**
 * Generate all possible combinations of k elements from an array
 * Uses recursive backtracking algorithm
 */
function generateCombinations(elements, combinationSize) {
    const allCombinations = [];
    
    function backtrack(startIndex, currentCombination) {
        // If we have enough elements, save this combination
        if (currentCombination.length === combinationSize) {
            allCombinations.push([...currentCombination]);
            return;
        }
        
        // Try adding each remaining element
        for (let i = startIndex; i < elements.length; i++) {
            currentCombination.push(elements[i]);
            backtrack(i + 1, currentCombination);
            currentCombination.pop(); // Backtrack
        }
    }
    
    backtrack(0, []);
    return allCombinations;
}

// ============================================================================
// SECRET FINDING FUNCTIONS
// ============================================================================

/**
 * Find the secret (constant term) using k minimum roots
 * Uses Lagrange interpolation to find polynomial coefficients
 */
function findSecretWithMinimumRoots(allRoots, k) {
    console.log(`\n🔍 Finding secret using minimum ${k} roots...`);
    
    // Generate all possible combinations of k roots
    const allCombinations = generateCombinations(allRoots, k);
    console.log(`📊 Generated ${allCombinations.length} combinations of ${k} roots`);
    
    const secretFrequencyMap = new Map();
    
    // Calculate secret for each combination
    allCombinations.forEach((rootCombination, index) => {
        try {
            const polynomialCoefficients = performLagrangeInterpolation(rootCombination);
            const constantTerm = polynomialCoefficients[0]; // f(0) = constant term c
            
            const secretKey = constantTerm.toString();
            secretFrequencyMap.set(secretKey, (secretFrequencyMap.get(secretKey) || 0) + 1);
            
            // Show first few combinations for debugging
            if (index < 3) {
                console.log(`  Combination ${index + 1}: Secret = ${constantTerm}`);
            }
        } catch (error) {
            console.log(`  Combination ${index + 1}: Error - ${error.message}`);
        }
    });
    
    // Find the most frequently occurring secret (majority vote)
    if (secretFrequencyMap.size === 0) {
        throw new Error("No valid secrets found from any combination");
    }
    
    const mostCommonSecret = [...secretFrequencyMap.entries()].reduce(
        (mostFrequent, current) => current[1] > mostFrequent[1] ? current : mostFrequent
    )[0];
    
    const secretFrequency = secretFrequencyMap.get(mostCommonSecret);
    
    // Display frequency analysis
    console.log(`\n📊 Secret frequency analysis:`);
    secretFrequencyMap.forEach((frequency, secret) => {
        console.log(`  Secret ${secret}: appears ${frequency} times`);
    });
    
    return {
        secret: BigInt(mostCommonSecret),
        frequency: secretFrequency,
        totalCombinations: allCombinations.length
    };
}

// ============================================================================
// MAIN EXECUTION FUNCTION
// ============================================================================

/**
 * Process a single test case and find the secret
 */
function processTestCase(filename) {
    try {
        console.log(`\n🚀 Processing test case: ${filename}`);
        console.log("=".repeat(60));
        
        // Step 1: Read and parse the JSON input file
        console.log("📖 Reading JSON file...");
        const inputData = JSON.parse(fs.readFileSync(filename, 'utf8'));
        
        const { keys, ...rootData } = inputData;
        const { n, k } = keys;
        
        console.log(`📊 Configuration: n=${n} roots, k=${k} minimum required`);
        console.log(`📋 Polynomial degree: m = k-1 = ${k-1}`);
        
        // Step 2: Decode all Y values from their respective bases
        console.log("\n🔧 Decoding Y values from different bases...");
        const decodedRoots = [];
        
        for (let i = 1; i <= n; i++) {
            if (rootData[i.toString()]) {
                const { base, value } = rootData[i.toString()];
                const x = parseInt(i);
                const y = decodeFromBase(value, base);
                
                decodedRoots.push({ x, y });
                console.log(`  Root ${i}: x=${x}, base=${base}, encoded="${value}" → y=${y}`);
            }
        }
        
        console.log(`\n✅ Successfully decoded ${decodedRoots.length} roots`);
        
        // Step 3: Find the secret using minimum k roots
        const result = findSecretWithMinimumRoots(decodedRoots, k);
        
        // Step 4: Display final result
        console.log("\n" + "=".repeat(60));
        console.log("🎯 RESULT");
        console.log("=".repeat(60));
        console.log(`✅ Secret (constant term c): ${result.secret}`);
        console.log(`📈 Secret appears in ${result.frequency}/${result.totalCombinations} combinations`);
        console.log(`📊 Polynomial degree: ${k-1}`);
        console.log(`🔢 Total roots provided: ${n}`);
        console.log(`🎯 Minimum roots required: ${k}`);
        
        return result.secret;
        
    } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error.message);
        throw error;
    }
}

/**
 * Main function that processes both test cases
 */
function main() {
    try {
        console.log("🚀 Shamir's Secret Sharing - Polynomial Constant Term Finder\n");
        
        const secrets = [];
        
        // Process first test case
        const secret1 = processTestCase('input.json');
        secrets.push(secret1);
        
        // Process second test case
        const secret2 = processTestCase('input2.json');
        secrets.push(secret2);
        
        // Display final summary
        console.log("\n" + "=".repeat(80));
        console.log("🎯 FINAL SUMMARY - BOTH TEST CASES");
        console.log("=".repeat(80));
        console.log(`✅ Test Case 1 Secret: ${secret1}`);
        console.log(`✅ Test Case 2 Secret: ${secret2}`);
        console.log("\n🎉 All test cases processed successfully!");
        
    } catch (error) {
        console.error("❌ Error occurred:", error.message);
        console.error("Stack trace:", error.stack);
    }
}

// ============================================================================
// PROGRAM EXECUTION
// ============================================================================

// Start the program
main();
  