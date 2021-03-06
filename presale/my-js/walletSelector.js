"use strict";
const presaleContractHash = "0xa276880B537de681b50c4f4bc7Cf6843d4da06Ee"
let bnbOwed = 0;
const tokensPerBnb = 630000000000

/**
 * Example JavaScript code that interacts with the page and Web3 wallets
 */

// Unpkg imports
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;
const Fortmatic = window.Fortmatic;
const evmChains = window.evmChains;

// Web3modal instance
let web3Modal

// Chosen wallet provider given by the dialog window
let provider;


// Address of the selected account
let selectedAccount;

let accounts = []


/**
 * Setup the orchestra
 */
function init() {

    console.log("Initializing example");
    console.log("WalletConnectProvider is", WalletConnectProvider);
    console.log("Fortmatic is", Fortmatic);
    console.log("window.web3 is", window.web3, "window.ethereum is", window.ethereum);

    // Check that the web page is run in a secure context,
    // as otherwise MetaMask won't be available
    // if(location.protocol !== 'https:') {
    //     // https://ethereum.stackexchange.com/a/62217/620
    //     const alert = document.querySelector("#alert-error-https");
    //     alert.style.display = "block";
    //     document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
    //     return;
    // }

    // Tell Web3modal what providers we have available.
    // Built-in web browser provider (only one can exist as a time)
    // like MetaMask, Brave or Opera is added automatically by Web3modal
    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider,
            options: {
                // Mikko's test key - don't copy as your mileage may vary
                infuraId: "8043bb2cf99347b1bfadfb233c5325c0",
            }
        },

        fortmatic: {
            package: Fortmatic,
            options: {
                // Mikko's TESTNET api key
                key: "pk_test_391E26A3B43A3350"
            }
        }
    };

    web3Modal = new Web3Modal({
        cacheProvider: false, // optional
        providerOptions, // required
        disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
    });

    console.log("Web3Modal instance is", web3Modal);
}


/**
 * Kick in the UI action after Web3modal dialog has chosen a provider
 */
async function fetchAccountData() {

    // Get a Web3 instance for the wallet
    const web3 = new Web3(provider);

    console.log("Web3 instance is", web3);

    // Get connected chain id from Ethereum node
    const chainId = await web3.eth.getChainId();
    // Load chain information over an HTTP API
    const chainData = evmChains.getChain(chainId);

    // Get list of accounts of the connected wallet
    const accounts = await web3.eth.getAccounts();

    // MetaMask does not give you all accounts, only the selected account
    console.log("Got accounts", accounts);
    selectedAccount = accounts[0];

    // Go through all accounts and get their ETH balance
    const rowResolvers = accounts.map(async (address) => {
        const balance = await web3.eth.getBalance(address);
        // ethBalance is a BigNumber instance
        // https://github.com/indutny/bn.js/
        const ethBalance = web3.utils.fromWei(balance, "ether");
        const humanFriendlyBalance = parseFloat(ethBalance).toFixed(4);
    });

    // Because rendering account does its own RPC commucation
    // with Ethereum node, we do not want to display any results
    // until data for all accounts is loaded
    await Promise.all(rowResolvers);
}



/**
 * Fetch account data for UI when
 * - User switches accounts in wallet
 * - User switches networks in wallet
 * - User connects wallet initially
 */
async function refreshAccountData() {

    // If any current data is displayed when
    // the user is switching acounts in the wallet
    // immediate hide this data
    // document.querySelector("#connected").style.display = "none";
    // document.querySelector("#prepare").style.display = "block";

    // Disable button while UI is loading.
    // fetchAccountData() will take a while as it communicates
    // with Ethereum node via JSON-RPC and loads chain data
    // over an API call.
    // document.querySelector("#btn-connect").setAttribute("disabled", "disabled")
    // await fetchAccountData(provider);
    // document.querySelector("#btn-connect").removeAttribute("disabled")
}


/**
 * Connect wallet button pressed.
 */
async function onConnect() {

    console.log("Opening a dialog", web3Modal);
    try {
        provider = await web3Modal.connect();
        await fetchAccountData();
    } catch(e) {
        console.log("Could not get a wallet connection", e);
        return -1;
    }

    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts) => {
        fetchAccountData();
    });

    // Subscribe to chainId change
    provider.on("chainChanged", (chainId) => {
        fetchAccountData();
    });

    // Subscribe to networkId change
    provider.on("networkChanged", (networkId) => {
        fetchAccountData();
    });

    await refreshAccountData();
}

/**
 * Disconnect wallet button pressed.
 */
async function onDisconnect() {

    console.log("Killing the wallet connection", provider);

    // TODO: Which providers have close method?
    if(provider.close) {
        await provider.close();

        // If the cached provider is not cleared,
        // WalletConnect will default to the existing session
        // and does not allow to re-scan the QR code with a new wallet.
        // Depending on your use case you may want or want not his behavir.
        await web3Modal.clearCachedProvider();
        provider = null;
    }

    selectedAccount = null;

    // Set the UI back to the initial state
    document.querySelector("#prepare").style.display = "block";
    document.querySelector("#connected").style.display = "none";
}

/**
 * Main entry point.
 */
let web3;

window.addEventListener('load', async () => {
    $("#claim-tokens").on("click", claimPresale)

    $(".start-presale-modal").on("click", () => {
        init();
        onConnect().then(x => {
            web3 = new Web3(provider)
            if (x != -1) {
                if (bnbOwed >= 2) {
                    $(".start-presale-modal").html('Contributed Max!');
                }
                else {
                    showModal();
                    $(".start-presale-modal").html('<i class="fas fa-door-open mr-2"></i>Enter the Presale');
                }

                setTimeout(function() {
                    if (bnbOwed >= 2) {
                        hideModal();
                        $(".start-presale-modal").html('Contributed Max!');
                    }
                }, 1000)

            }
            else {
                console.log(x);
                // alert("Error connecting wallet. We suggest you join the presale by sending BNB directly to the contract")
                $(".start-presale-modal").text("ERROR CONNECTING WALLET");
            }

            // // console.log(x)
            bnbCollected().then(x => {

            });
            //
            //
            contributionChecker().then(x => {

            })

        });
    });

    $(".connect-wallet-only").on("click", () => {
        init();
        onConnect().then(x => {
            web3 = new Web3(provider)
            if (x != -1) {
                $(".connect-wallet-only").hide();
            }

            // // console.log(x)
            bnbCollected().then(x => {

            });
            //
            //
            contributionChecker().then(x => {

            })

        });
    });





    // document.querySelector("#btn-connect").addEventListener("click", onConnect);
    // document.querySelector("#btn-disconnect").addEventListener("click", onDisconnect);
});

function showModal() {
    //$('#presaleModal').modal('show');
}

function hideModal() {
    $('#presaleModal').modal('hide');
}


const createContract = (abi, contractHash) => new web3.eth.Contract(abi, contractHash);

const checkMetaAndShowModal = async () => {
    const metaConnect = await window.ethereum.request({ method: 'eth_requestAccounts' });
    accounts = metaConnect;
    showModal(); // open modal
}


const bnbCollected = async () => {
    var last_balance = 0;
    var diff = 0;
    const hardcap = 500;
    var a = 0;
    setInterval(async () => {
        // await web3.eth.getBalance(presaleContractHash, (err, res) => {
        //     const balance = res / 1E18;
        //     if (balance > last_balance) {
        //         diff = balance - last_balance;
        //         last_balance = balance;
        //     }
        //     const percentage = balance * 100 / hardcap;

        $("#bnb-raised").text("100.34% (501.71)");

        $('#progress-bar-presale').attr("aria-valuenow", 100);
            // $("#bnb-raised").text(percentage.toFixed(2) + "% (" + balance.toFixed(2) + ")");
            //
            // $('#progress-bar-presale').attr("aria-valuenow", percentage);
        // })
    }, 1000);
}

const contributionChecker = async () => {
    const presaleContract = await createContract(abi, presaleContractHash);
    setInterval(async () => {
        const owedDiujInt = await presaleContract.methods.tokensOwned(selectedAccount).call();
        const owed = owedDiujInt / 1e9;
        bnbOwed = owed / tokensPerBnb;
        $("#tokens-reserved").html(owed/1E9.toFixed(2) + "<b>B</b>");
        $("#bnb-contrib").text((owed / tokensPerBnb).toFixed(2));
    }, 1000);
}

const claimPresale = async () => {
    const presaleContract = await createContract(abi, presaleContractHash);
    await presaleContract.methods.claimTokens().send({from: selectedAccount});

}

const buyPresale = async (amt) => {
    web3.eth.sendTransaction(
        {
            from: selectedAccount,
            to: presaleContractHash,
            value: amt*1e18,
            gas: "210000"
        }, function(err, transactionHash) {
            if (!err)
                console.log(transactionHash + " success");
        }
    );

    $(".thx-for-presale").fadeIn();
    setTimeout(function() {
        hideModal();
        //$(".thx-for-presale").hide();
    }, 2000);

    setTimeout(function() {
        //hideModal();
        $(".thx-for-presale").hide();
    }, 8000);


}
