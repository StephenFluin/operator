import { NgIf } from '@angular/common';
import { Input, Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-explorer',
  standalone: true,
  templateUrl: './explorer.html',
  imports: [NgIf],
})
export class ExplorerComponent {
  @Input({ required: true }) address: string | null = null;
  @Input({ required: true }) chain: number | null = null;
  @Input() confirmed: boolean = false;

  chainURL = '';
  chainName = '';

  constructor() {}
  ngOnChanges() {
    this.chainURL = (() => {
      if (!this.address) return '';
      if (!this.chain) return this.address;
      return calculateChain(this.address, this.chain);
    })();

    this.chainName = calculateChainName(this.chain);
  }
}
export function calculateChain(address: string, chain: number) {
  switch (chain) {
    case 43113:
      return `https://testnet.snowtrace.io/address/${address}`;
    case 97:
      return `https://testnet.bscscan.com/address/${address}`;
    case 80001:
      return `https://mumbai.polygonscan.com/address/${address}`;
    default:
      return `https://axelarscan.io/address/${address}`;
  }
}
export function calculateChainName(chain: number | null): string {
  switch (chain) {
    case 43113:
      return `Avalanche Fuji Testnet`;
    case 97:
      return `BNB Testnet`;
    case 80001:
      return 'Polygon Mumbai Testnet';
    default:
      console.log('unknown chain', chain);
      return `Other`;
  }
}
export function calculateAxelarName(chain: number | null): string {
  switch (chain) {
    case 43113:
      return `Avalanche`;
    case 97:
      return `binance`;
    case 80001:
      return 'polygon';
    default:
      console.log('unknown chain', chain);
      return `other`;
  }
}
