import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home';
import { AbisComponent } from './abis/abis.component';
import { DeployTokenManagerComponent } from './deploy-token-manager/deploy-token-manager.component';

@NgModule({
  declarations: [AppComponent, HomeComponent, AbisComponent],
  imports: [
    BrowserModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'abis', component: AbisComponent },
    ]),
    DeployTokenManagerComponent,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
