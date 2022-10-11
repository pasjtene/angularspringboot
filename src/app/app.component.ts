import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, startWith } from 'rxjs';
import { CustomResponse } from './interface/custom-response';
import { AppState } from './interface/app-state';
import { ServerService } from './service/server.service';
import { DataState } from './enum/data.state.enum';
import { map } from 'rxjs/operators';
import { Status } from './enum/status.enum';
import { faCoffee } from '@fortawesome/free-solid-svg-icons';
import { NgForm } from '@angular/forms';
import { Server } from './interface/server';
import {NgbModal, ModalDismissReasons} from '@ng-bootstrap/ng-bootstrap';
import { NotifierService } from 'angular-notifier';
import { NotificationService } from './service/notification.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  //The following option is added to improve performance
  //see https://www.youtube.com/watch?v=8ZPsZBcue50&t=9476s (3:41)
  //recommended when using observables throughout. statice assigments will not 
  //be checked
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  title = 'angularspringboot';
  faCoffee = faCoffee;
  appState$: Observable<AppState<CustomResponse>>;
  readonly DataState = DataState;
  readonly Status = Status;
  private filterSubject = new BehaviorSubject<String>("");
  private dataSubject = new BehaviorSubject<CustomResponse>(null);
  filterStatus$ = this.filterSubject.asObservable();
  private isLoading = new BehaviorSubject<boolean>(false);
  isLoading$ = this.isLoading.asObservable();
  closeResult = '';
  //private readonly notifier: NotifierService;

  constructor(
    private serverService: ServerService,
    private modalService: NgbModal,
    //The notifier service uses the original service provided https://www.npmjs.com/package/angular-notifier
   // private notifier: NotifierService
    private notifier: NotificationService
    ) {}

  
  
  
  ngOnInit(): void {
    this.appState$ = this.serverService.servers$
    .pipe(
      map(response => {
        this.dataSubject.next(response)
        //this.notifier.notify('success', 'You are awesome! I mean it!')
        this.notifier.onDefault(response.message)
        
        //return {dataState: DataState.LOADED_STATE, appData: response} //this works, but we can reverse the data to make the 
       //latest added server appear on top
        return {dataState: DataState.LOADED_STATE, appData: {...response, data:{servers: response.data.servers.reverse()}} }
      }),
      startWith({ dataState: DataState.LOADING_STATE}),
      catchError((error: string) => {
        this.notifier.onError(error);
        return of({dataState: DataState.ERROR_STATE, error})
      })
    );
  }

  open(content) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }


  pingServer(ipAddress: string): void {
    this.filterSubject.next(ipAddress);
    this.appState$ = this.serverService.ping$(ipAddress)
    .pipe(
      map(response => {
        const index = this.dataSubject.value.data.servers.findIndex(
          server => server.id === response.data.server.id
        )

        this.dataSubject.value.data.servers[index] = response.data.server;
        this.notifier.onDefault(response.message)
       
        this.filterSubject.next('');
        return {dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
      catchError((error: string) => {
        this.filterSubject.next('');
        this.notifier.onError(error);
        return of({dataState: DataState.ERROR_STATE, error})
      })
    );
  }

  saveServer(serverForm: NgForm): void {
    this.isLoading.next(true);
    this.appState$ = this.serverService.save$(serverForm.value as Server)
    .pipe(
      map(response => {
        this.dataSubject.next(
          {...response, 
            data: {servers: [response.data.server, ...this.dataSubject.value.data.servers]}}
        );
        this.notifier.onDefault(response.message)

        document.getElementById('closeModal').click();
        this.isLoading.next(false);
        serverForm.resetForm({status: this.Status.SERVER_DOWN});
        return {dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
      catchError((error: string) => {
        this.isLoading.next(false);
        this.notifier.onError(error);
        return of({dataState: DataState.ERROR_STATE, error})
      })
    );
  }

  


  //filterServers(status: Status): void {
    filterServers(status: string): void {
    this.appState$ = this.serverService.filter$(status, this.dataSubject.value)
    .pipe(
      map(response => {
        this.notifier.onDefault(response.message)
        return {dataState: DataState.LOADED_STATE, appData: response}
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
      catchError((error: string) => {
        this.filterSubject.next('');
        this.notifier.onError(error);
        return of({dataState: DataState.ERROR_STATE, error})
      })
    );
  }

  deleteServer(server: Server): void {
    
    this.appState$ = this.serverService.delete$(server.id)
    .pipe(
      map(response => {
        this.notifier.onDefault(response.message)
        this.dataSubject.next(
          {...response, data: 
            {servers: this.dataSubject.value.data.servers.filter(s=> s.id !==server.id)}}
           
        )
        return {dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}
      }),
      startWith({ dataState: DataState.LOADED_STATE, appData: this.dataSubject.value}),
      catchError((error: string) => {
        this.notifier.onError(error);
        return of({dataState: DataState.ERROR_STATE, error})
      })
    );
  }

  printReport(): void {
    window.print();
    this.notifier.onDefault("Report printed")
//following is for excel printing 
    /*
    let dataType = 'application/vnd.ms-excel.sheet.macroEnabled.12';
    let tableSelect = document.getElementById('servers');
    let tableHtml = tableSelect.outerHTML.replace(/ /g, '%20');
    let downloadLink = document.createElement('a');
    document.body.appendChild(downloadLink);
    downloadLink.href = 'data:' + dataType + ', ' + tableHtml;
    downloadLink.download = 'server-report.xls';
    downloadLink.click();
    document.body.removeChild(downloadLink);
    */
  }


  
}
