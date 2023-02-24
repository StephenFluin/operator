import { ChangeDetectorRef, Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AbiManager } from '../abi-manager.service';
import { CounterABI } from '../counter-abi';
import { OperatorABI } from '../operator-abi';
import { ERC20Abi } from '../erc20-abi';
import { ethers, Contract } from 'ethers';

type MethodList = any[];

@Component({
  selector: 'app-home',
  templateUrl: 'home.html',
})
export class HomeComponent {
  contracts: { [key: string]: any } = {};
  methods: MethodList = [];
  values: { [key: string]: any } = {};

  address: string = '';
  // = '0xAF37342e003E90DCa134A3dF76C52aeEFC4bA39d';

  operatorABI = JSON.stringify(OperatorABI);
  counterABI = JSON.stringify(CounterABI);
  ERC20Abi = JSON.stringify(ERC20Abi);

  provider = new ethers.providers.Web3Provider((<any>window)['ethereum']);
  signer = this.provider.getSigner();

  selectedContract: ethers.Contract | null = null;

  ethereum = (<any>window)['ethereum'];

  chainChanged: BehaviorSubject<string> = new BehaviorSubject<string>('0');
  accountsChanged: BehaviorSubject<string[]> = new BehaviorSubject<string[]>(
    []
  );

  constructor(
    public manager: AbiManager,
    public changeDetector: ChangeDetectorRef
  ) {
    this.ethereum.on('chainChanged', (chainId: string) => {
      console.log("chain changed to",chainId,"from",this.chainChanged.value)
      this.chainChanged.next(chainId);
      this.provider = new ethers.providers.Web3Provider((<any>window)['ethereum']);
      this.selectedContract = null;
      this.address = '';
      this.methods = [];
      this.changeDetector.detectChanges();
    });
    this.ethereum.on('accountsChanged', (accounts: string[]) => {
      this.accountsChanged.next(accounts);
    });

    this.provider.getNetwork().then((network) => {
      this.chainChanged.next(`${network.chainId} (${network.name})`);
    });
    // Maybe shouldn't do this every time, @TODO
    this.connect();
  }

  pick(abi: string, address: string) {
    // console.log('about to pick!', abi, address);
    this.address = address;

    this.selectedContract = new Contract(
      address,
      JSON.parse(abi),
      this.provider
    );

    this.methods = JSON.parse(abi);
  }

  run(methodName: string, form: any) {
    if (!this.selectedContract) {
      console.error('No contract selected');
      return;
    }
    const chosenMethod = this.methods.find((x) => x.name == methodName);
    if (!chosenMethod) {
      console.error('No method specified');
      return;
    }
    let activation: (...args: any[]) => Promise<any> = () => Promise.resolve();
    const args = Array.from(form).map((x: any) => x.value);

    // Set activation to the method depending on view or not view
    // Check the method matching `methodName`
    console.log(
      'Searched ',
      this.selectedContract.interface.fragments,
      'for',
      methodName,
      'and found',
      chosenMethod
    );

    for (let i = 0; i < args.length; i++) {
      if (chosenMethod.inputs[i].type === 'bytes') {
        args[i] = JSON.parse(args[i]);
      }
    }
    console.log('args includes', args,'chosen method',chosenMethod);

    let targetContract = this.selectedContract;
    if (chosenMethod.stateMutability === 'view') {
      console.log('calling without signer');
    } else {
      console.log('Connecting with signer');
      targetContract = this.selectedContract.connect(this.signer);
      console.log('target contract is now',targetContract);
    }
    targetContract[methodName](...args)
      .then((result: string) => {
        console.log('run of', methodName, 'returned', result);
        // This forces Angular Change Detection
        this.values[methodName] = result;
        this.changeDetector.detectChanges();
      })
      .catch((err: any) => {
        console.log('Contract error, are you on the wrong chain?');
        let shownError = err.message;
        if(err.error?.message) {
          shownError = err.error.message;
        }
        if(err.error?.data?.message) {
          shownError = err.error.data.message;
        }
        console.log("shown error is",shownError);
        this.values[methodName] = `Error: ${shownError}`;
      });
  }
  async connect() {
    const result = this.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('connect result is', result);
    const accountList = await result;
    console.log('and resolves to', accountList);
    this.accountsChanged.next(accountList);
  }
}
