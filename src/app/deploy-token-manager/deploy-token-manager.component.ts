import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ethers, Contract } from 'ethers';
import { ITSAbi } from './interchain-token-service-abi';

// BNB Token: 0x1d4EBf060EA1ad3ff7fdB20B09b644A0241cA9E9
// Avalanche token: 0xAF37342e003E90DCa134A3dF76C52aeEFC4bA39d

@Component({
  selector: 'app-deploy-token-manager',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Deploy Token Managers</h2>
    <div>Currently connected as {{ address() }}</div>
    <p>
      This is a tool to demonstrate the process of turning tokens into
      Interchain tokens!
    </p>
    <p>Follow the steps:</p>
    <h2>Setup your Token Managers</h2>
    <p>
      <strong>Step 1</strong> Deploy your tokens. Your tokens must be able to
      grant mint/burn permissions to the future Token Manager.
    </p>
    <ol>
      <li>Deploy to Chain 1</li>
      <li>Deploy to Chain 2</li>
    </ol>
    <p><strong>Step 2</strong> Deploy token managers</p>
    <label>Token Manager Type <input type="number" value="1" #type /> </label>
    <label
      >Token Address
      <input
        type="text"
        #address1
        value="0x1d4EBf060EA1ad3ff7fdB20B09b644A0241cA9E9"
    /></label>
    <label
      >Token 2 Address
      <input
        type="text"
        #address2
        value="0xAF37342e003E90DCa134A3dF76C52aeEFC4bA39d"
    /></label>
    <label>Token 2 Chain <input type="text" #chain2 value="Avalanche" /></label>
    <button
      (click)="create(type.value, address1.value, address2.value, chain2.value)"
    >
      Create
    </button>
    <p>
      Calling create here will call "deployCustomTokenManager" on the ITS for
      the token on the currently selected blockchain, and then call
      "deployRemoteCustomTokenManager" on the local ITS, which initiates a
      message to the ITS on the target blockchain and creates a corresponding
      token manager there.
    </p>
    <div *ngIf="params">{{ params }}</div>
    <p>
      <strong>Step 3</strong> Give permissions on your tokens to the token
      manager
    </p>
    <h2>Send your interchain tokens</h2>
    <p>
      <strong>Step 2</strong> Approve the token manager to spend some of your
      tokens
    </p>
    <p><strong>Step 3</strong> sendToken on the Token Manager!</p>
  `,
  styles: ['label {display:block;}'],
})
export class DeployTokenManagerComponent {
  params: any;
  address = signal<string | null>(null);
  ethereum = (<any>window)['ethereum'];
  signer: ethers.providers.JsonRpcSigner | null = null;
  ITSContract: ethers.Contract | null = null;
  ITSContractWithSigner: ethers.Contract | null = null;

  constructor() {
    this.ethereum.on('accountsChanged', (accounts: string[]) => {
      console.log('changing account', accounts);
      this.address.set(accounts[0]);
    });
    this.connect();
  }
  async connect() {
    const result = this.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('connect result is', result);
    const accountList = await result;
    console.log('and resolves to', accountList);
    this.address.set(accountList[0]);

    const provider = new ethers.providers.Web3Provider(this.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();

    this.ITSContract = new ethers.Contract(
      '0xF786e21509A9D50a9aFD033B5940A2b7D872C208',
      ITSAbi,
      provider
    );
    this.ITSContractWithSigner = this.ITSContract.connect(signer);
  }

  async create(
    type: string,
    address1: string,
    address2: string,
    chain2: string
  ) {
    console.log('let us deploy a token manager!', ethers);
    const userAddress = this.address();
    console.log('encoding with user address', userAddress);
    this.params = ethers.utils.defaultAbiCoder.encode(
      ['bytes', 'address'],
      [userAddress, address1]
    );
    if (!this.ITSContractWithSigner || !this.ITSContract) {
      throw new Error('contract/signer not setup');
    }

    const salt = ethers.utils.hexZeroPad(
      ethers.utils.hexlify(Math.round(Math.random() * 1000000)),
      32
    );
    const tmType = [parseInt(type, 10)];

    // Create a token Manager
    const tx = this.ITSContractWithSigner['deployCustomTokenManager'](
      salt,
      tmType,
      this.params
    );

    // Collect resulting tokenId
    try {
      const result = await tx;
      console.log(
        'run of deployRemoteCustomTokenManager returned TX of ',
        tx,
        'and the result: ',
        result
      );
      console.log('waiting for receipt...');
      const receipt = await result.wait();
      console.log('receipt is', receipt);
      const claimEvent = receipt.events.find(
        (event: any) => event.event === 'CustomTokenIdClaimed'
      );
      console.log('claim event is:', claimEvent);
      const TID = claimEvent.args[0];
      console.log(TID, 'is your TokenID');

      const tokenManagerAddress = await this.ITSContract[
        'getTokenManagerAddress'
      ](TID);
      console.log('TmAddress SHOULD BE', tokenManagerAddress);

      localStorage['tokenManager'] = JSON.stringify({
        salt: salt,
        token: address1,
        id: TID,
        tokenManager: tokenManagerAddress,
      });

      // Now trigger the remote one!
      this.params = ethers.utils.defaultAbiCoder.encode(
        ['bytes', 'address'],
        [userAddress, address2]
      );
      console.log(
        'creating remote token manager with:',
        salt,
        chain2,
        tmType,
        this.params,
        ethers.utils.parseEther('0.1')
      );
      const tx2 = this.ITSContractWithSigner['deployRemoteCustomTokenManager'](
        salt, // Salt
        chain2, // Destination Chain
        tmType, // TokenManagerType
        this.params, // bytes params
        ethers.utils.parseEther('0.1'), // gasLimit (for use with Multicall)
        { value: ethers.utils.parseEther('0.1') }
      );
      console.log(await tx2);
    } catch (err: any) {
      console.log('Contract error, are you on the wrong chain?', err);
      let shownError = err.message;
      if (err.error?.message) {
        shownError = err.error.message;
      }
      if (err.error?.data?.message) {
        shownError = err.error.data.message;
      }
      console.log('shown error is', shownError);
    }
  }
}
