import { Component } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

// declare var ga: any;
declare var gtag: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'angular-operator';
  constructor(router: Router, title: Title) {
    
    router.events.pipe(filter((e) => e.type === 'NavigationEnd'))
    .subscribe((n: any) => {
      title.getTitle();
      window.scrollTo(0, 0);
      // ga('send', 'pageview', n.urlAfterRedirects);
      // gtag('config', 'G-EQV8B2CF0C', { page_path: n.urlAfterRedirects });
  });
  }
  
}

