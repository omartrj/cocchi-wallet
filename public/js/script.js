const testnet = "https://rpc2.sepolia.org/"
const web3 = new Web3(new Web3.providers.HttpProvider(testnet))

const contractAddress = "0xa557589cD7BDA38C2a985649656F56dC4cDbb6be";
const contractJsonInterface = [
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [{ "internalType": "uint256", "name": "requested", "type": "uint256" }, { "internalType": "uint256", "name": "available", "type": "uint256" }], "name": "InsufficientBalance", "type": "error" },
    { "inputs": [{ "internalType": "address", "name": "receiver", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [{ "internalType": "address", "name": "receiver", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "send", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "from", "type": "address" }, { "indexed": false, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Sent", "type": "event" },
    { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "balances", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "minter", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }
];
const contract = new web3.eth.Contract(contractJsonInterface, contractAddress);

let currentPublicAddress = "";
let usedMetamask = false;
let currentPrivateKey = "";

const inputPrivateKeyElement = document.querySelector("#private-key");
const loginButtonElement = document.querySelector("#login-button");
const metamaskButtonElement = document.querySelector("#metamask-button");
const logoutButtonElement = document.querySelector("#logout-button");
const addressElement = document.querySelector("#address");
const addressTooltipElement = document.querySelector("#address-tooltip");
const balanceElement = document.querySelector("#balance");
const refreshButtonElement = document.querySelector("#refresh-button");
const inputTargetAddressElement = document.querySelector("#target-address");
const inputAmountElement = document.querySelector("#amount");
const sendButtonElement = document.querySelector("#send-button");
const mintButtonElement = document.querySelector("#mint-button");
const balanceButtonElement = document.querySelector("#balance-button");
const dialogElement = document.querySelector("#dialog");

/* Funzione per switchare tra le pagine */
function show(shown, hidden) {
    document.getElementById(shown).style.opacity = '1';
    document.getElementById(shown).style.display = 'flex';
    document.head.querySelector("title").textContent = "$COCCHI Wallet - " + shown.charAt(0).toUpperCase() + shown.slice(1, -5);

    document.getElementById(hidden).style.opacity = '0';
    document.getElementById(hidden).style.display = 'none';

    //Svuota i campi input
    inputTargetAddressElement.value = "";
    inputAmountElement.value = "";
    inputPrivateKeyElement.value = "";

    return false;
}

/* Funzione per rendere valido l'indirizzo */
function validateAddress(address) {
    let validAddress = "";
    if (address.startsWith("0x")) {
        address = address.slice(2);
    }
    validAddress = "0x" + address.toUpperCase();
    return validAddress;
}

/* Funzione per il login */
async function login(privateKey) {
    showDialog({ type: "warning", title: "Login in progress", message: "Please wait." });
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    currentPublicAddress = account.address;
    currentPrivateKey = privateKey;
    currentPublicAddress = validateAddress(currentPublicAddress);
    updateAddress();
    await updateBalance();
    usedMetamask = false;
}

loginButtonElement.addEventListener("click", async () => {
    let privateKey = inputPrivateKeyElement.value;
    //Se la chiave privata non inizia con 0x, la aggiungo
    if (!privateKey.startsWith("0x")) {
        privateKey = "0x" + privateKey;
    }
    try {
        await login(privateKey);
        show("wallet-view", "login-view");
        closeDialog();
    } catch (error) {
        showDialog({ type: "error", title: "Login error", message: error.message });
    }
});

/* Funzione per il login con metamask */
metamaskButtonElement.addEventListener("click", async () => {
    showDialog({ type: "warning", title: "Login in progress", message: "Please connect your MetaMask wallet." });
    try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        currentPublicAddress = accounts[0];
        //Rendi la currentPublicAddress maiuscola tranne 0x
        currentPublicAddress = validateAddress(currentPublicAddress);
        updateAddress();
        await updateBalance();
        show("wallet-view", "login-view");
        usedMetamask = true;
        closeDialog();
    } catch (error) {
        showDialog({ type: "error", title: "Login error", message: "MetaMask wallet not connected." });
    }
});

function shortenAddress(address) {
    return address.slice(0, 6) + "..." + address.slice(-4);
}

/* Funzione per il logout */
logoutButtonElement.addEventListener("click", async () => {
    currentPublicAddress = "";
    currentPrivateKey = "";
    usedMetamask = false;
    show("login-view", "wallet-view");
});

/* Funzione per mostrare l'indirizzo */
function updateAddress() {
    // Abbrevia l'indirizzo
    let address = shortenAddress(currentPublicAddress);
    addressElement.querySelector("span").textContent = address;
}

/* Funzione per recuperare il saldo */
async function getBalance(targetAddress, fromAddress = currentPublicAddress) {
    const balance = await contract.methods.balances(targetAddress).call({ from: fromAddress });
    return balance;
}

/* Funzione per mostrare il saldo */
async function updateBalance() {
    const balance = await getBalance(currentPublicAddress);
    balanceElement.textContent = balance;
}

/* Funzione per gestire il click sul bottone "Balance" */
balanceButtonElement.addEventListener("click", async () => {
    showDialog({ type: "warning", title: "Transaction in progress", message: "Please wait while the balance is being retrieved." });
    const targetAddress = inputTargetAddressElement.value;
    const balance = await getBalance(targetAddress);
    showDialog({ type: "success", title: "Balance", message: `The current balance of ${getHref({ type: "address", string: targetAddress })} is <strong>${balance} CCH</strong>` });
});

/* Funzione per gestire il click sul bottone "Refresh" */
let interval;
refreshButtonElement.addEventListener("click", async () => {
    let updated = false;
    updateBalance().then(() => {
        updated = true;
    });
    refreshButtonElement.style.animation = "rotate 1s linear";
    interval = setInterval(() => {
        if (!updated) {
            refreshButtonElement.style.animation = "rotate 1s linear";
        } else {
            refreshButtonElement.style.animation = "none";
            clearInterval(interval);
        }
    }, 1000);
});


/* Funzioni per gestire il dialog */
function showDialog({ type, title, message }) {
    //If the dialog is already open, close it and open a new one
    if (dialogElement.open) {
        dialogElement.close();
    }
    dialogElement.classList.remove("error", "warning", "success");
    dialogElement.classList.add(type);
    dialogElement.querySelector("h3").textContent = title;
    dialogElement.querySelector("p").innerHTML = message;
    dialogElement.showModal();

}
function closeDialog() {
    dialogElement.close();
}
dialogElement.querySelector("button").addEventListener("click", closeDialog);

/* Funzione per mostrare il tooltip */
addressElement.addEventListener("mouseenter", () => {
    addressTooltipElement.querySelector("p").textContent = "Copy to clipboard";
    addressTooltipElement.style.opacity = "1";
    addressTooltipElement.style.top = "60px";
    addressTooltipElement.style.zIndex = "1";
});

/* Funzione per nascondere il tooltip */
addressElement.addEventListener("mouseleave", () => {
    addressTooltipElement.style.opacity = "0";
    addressTooltipElement.style.top = "40px";
    addressTooltipElement.style.zIndex = "-1";
});

/* Funzione per gestire il click sull'indirizzo */
addressElement.addEventListener("click", () => {
    navigator.clipboard.writeText(currentPublicAddress);
    addressTooltipElement.querySelector("p").textContent = "Copied!";
});

/* Funzione per mostrare le informazioni della ricevuta */
function showReceiptInfo(receipt, receiverAddress, amount) {
    let receiptType = "";
    let receiptTitle = "";
    let receiptMessage = "";
    if (receipt.status) {
        receiptType = "success";
        receiptTitle = "Transaction successful";
        receiptMessage =
            `<strong>Contract Address:</strong> ${getHref({ type: "address", string: receipt.to })}<br>
            <strong>Block Hash:</strong> ${getHref({ type: "block", string: receipt.blockHash })}<br>
            <strong>Block Number:</strong> ${receipt.blockNumber}<br>
            <strong>Transaction Hash:</strong> ${getHref({ type: "tx", string: receipt.transactionHash })}<br>
            <strong>Transaction Index:</strong> ${receipt.transactionIndex}<br>
            <strong>From:</strong> ${getHref({ type: "address", string: receipt.from })}<br>
            <strong>To:</strong> ${getHref({ type: "address", string: receiverAddress })}<br>
            <strong>Amount:</strong> ${amount} CCH<br>
            <strong>Gas Used:</strong> ${receipt.gasUsed}`
    }
    else {
        receiptType = "error";
        receiptTitle = "Transaction failed";
        receiptMessage = "The transaction has been reverted by the network.";
    }
    showDialog({ type: receiptType, title: receiptTitle, message: receiptMessage });

};

function getLinkToEtherscan({ type, string }) {
    // type: "tx" | "address" | "block"
    return `https://sepolia.etherscan.io/${type}/${string}`;
}

function getHref({ type, string }) {
    let textContent = shortenAddress(validateAddress(string));
    let link = '<a href="' + getLinkToEtherscan({ type, string }) + '" target="_blank">' + textContent + '</a>';
    return link;
}

/* Funzione per creare una transazione di Send */
async function createSendTransaction(receiverAddress, amount) {

    const estimatedGasConsumption = await contract.methods.send(receiverAddress, amount).estimateGas({ from: currentPublicAddress })
    const estimatedGasPrice = await web3.eth.getGasPrice()
    const sendCallDataABI = await contract.methods.send(receiverAddress, amount).encodeABI()
    const transactionCount = await web3.eth.getTransactionCount(currentPublicAddress)

    let sendTransaction = {};
    if (!usedMetamask) {
        sendTransaction = {
            from: currentPublicAddress,
            to: contractAddress,
            value: 0,
            gas: estimatedGasConsumption + estimatedGasConsumption,
            gasPrice: estimatedGasPrice,
            nonce: transactionCount,
            data: sendCallDataABI
        }
    } else {
        sendTransaction = {
            from: currentPublicAddress,
            to: contractAddress,
            value: 0,
            data: sendCallDataABI
        }
    }

    return sendTransaction

}

async function send(receiverAddress, amount) {
    if (!usedMetamask) {
        const sendTransaction = await createSendTransaction(receiverAddress, amount);
        const signedTransaction = await web3.eth.accounts.signTransaction(sendTransaction, currentPrivateKey);
        web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)
            .on('receipt', receipt => {
                showReceiptInfo(receipt, receiverAddress, amount);
                updateBalance();
            });
        updateBalance();
    } else {
        const sendTransaction = await createSendTransaction(receiverAddress, amount);
        ethereum.request({ method: 'eth_sendTransaction', params: [sendTransaction] })
            .then(transactionHash => {
                //every 10 seconds, check if the transaction exists
                const interval = setInterval(async () => {
                    const transaction = await web3.eth.getTransaction(transactionHash);
                    if (transaction) {
                        clearInterval(interval);
                        const receipt = await web3.eth.getTransactionReceipt(transactionHash);
                        showReceiptInfo(receipt, receiverAddress, amount);
                        updateBalance();
                    }
                }, 10000);
            });
        updateBalance();
    }
}

/* Funzione per gestire il click sul bottone "Send" */
sendButtonElement.addEventListener("click", async () => {
    const amount = inputAmountElement.value;
    if (amount <= 0) {
        showDialog({ type: "error", title: "Transaction error", message: "The amount must be greater than 0." });
        return;
    }
    showDialog({ type: "warning", title: "Transaction in progress", message: "Please wait while the 'SEND' transaction is being processed." });
    const receiverAddress = validateAddress(inputTargetAddressElement.value);

    try {
        await send(receiverAddress, amount);
    } catch (error) {
        showDialog({ type: "error", title: "Transaction error", message: error.message });
    }
});

/* Funzione per creare una transazione di Mint */
async function createMintTransaction(receiverAddress, amount) {
    const estimatedGasConsumption = await contract.methods.mint(receiverAddress, amount).estimateGas({ from: currentPublicAddress })
    const estimatedGasPrice = await web3.eth.getGasPrice()
    const mintCallDataABI = await contract.methods.mint(receiverAddress, amount).encodeABI()
    const transactionCount = await web3.eth.getTransactionCount(currentPublicAddress)

    let mintTransaction = {};
    if (!usedMetamask) {
        mintTransaction = {
            from: currentPublicAddress,
            to: contractAddress,
            value: 0,
            gas: estimatedGasConsumption + estimatedGasConsumption,
            gasPrice: estimatedGasPrice,
            nonce: transactionCount,
            data: mintCallDataABI
        }
    } else {
        mintTransaction = {
            from: currentPublicAddress,
            to: contractAddress,
            value: 0,
            data: mintCallDataABI
        }
    }

    return mintTransaction
}

async function mint(receiverAddress, amount) {
    const mintTransaction = await createMintTransaction(receiverAddress, amount);
    if (!usedMetamask) {
        const signedTransaction = await web3.eth.accounts.signTransaction(mintTransaction, currentPrivateKey);
        web3.eth.sendSignedTransaction(signedTransaction.rawTransaction)
            .on('receipt', receipt => {
                showReceiptInfo(receipt, receiverAddress, amount);
                updateBalance();
            });
        updateBalance();
    } else {
        ethereum.request({ method: 'eth_sendTransaction', params: [mintTransaction] })
            .then(transactionHash => {
                //every 10 seconds, check if the transaction exists
                const interval = setInterval(async () => {
                    const transaction = await web3.eth.getTransaction(transactionHash);
                    if (transaction) {
                        clearInterval(interval);
                        const receipt = await web3.eth.getTransactionReceipt(transactionHash);
                        showReceiptInfo(receipt, receiverAddress, amount);
                        updateBalance();
                    }
                }, 10000);
            });
        updateBalance();
    }
}

/* Funzione per gestire il click sul bottone "Mint" */
mintButtonElement.addEventListener("click", async () => {
    const amount = inputAmountElement.value;
    if (amount <= 0) {
        showDialog({ type: "error", title: "Transaction error", message: "The amount must be greater than 0." });
        return;
    }
    showDialog({ type: "warning", title: "Transaction in progress", message: "Please wait while the 'MINT' transaction is being processed." });
    const receiverAddress = validateAddress(inputTargetAddressElement.value);
    try {
        await mint(receiverAddress, amount);
    } catch (error) {
        showDialog({ type: "error", title: "Transaction error", message: error.message });
    }
});


