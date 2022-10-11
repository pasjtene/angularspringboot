import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {  Observable,  Subscriber,  throwError } from 'rxjs';
import { catchError, tap,  } from 'rxjs/operators';
import { Status } from '../enum/status.enum';
import { CustomResponse } from '../interface/custom-response';
import { Server } from '../interface/server';

@Injectable({
  providedIn: 'root'
})
export class ServerService {
  private readonly apiUrl = 'http://localhost:8086/api';

  constructor(private http: HttpClient) { }
/*
This works, but lets do it differently
  getServers(): Observable<CustomResponse> {
    return this.http.get<CustomResponse>('http://localhost:8080/server/list')
  }
*/

servers$ = <Observable<CustomResponse>>
          this.http.get<CustomResponse>(this.apiUrl+'/server/list')
            .pipe(
              tap(console.log),
              catchError(this.handleError)

            );


    save$ = (server: Server) => <Observable<CustomResponse>>
    this.http.post<CustomResponse>(this.apiUrl+'/server/save', server)
      .pipe(
        tap(console.log),
        catchError(this.handleError)

      );

      //filter$ = (status: Status, response: CustomResponse) => <Observable<CustomResponse>>
      filter$ = (status: string, response: CustomResponse) => <Observable<CustomResponse>>
        new Observable<CustomResponse>(
          subscriber => {
            console.log(response);
            subscriber.next(
              status === Status.ALL? {...response, message: 'Servers filtered by status: '+status} :
              {
                ...response, 
                message: response.data.servers
                .filter(server=> server.status === status).length > 0? status ===Status.SERVER_UP ? 
                'Servers filtered by SERVER UP':"Servers filtered by Server Down": 'No servers of found.. '+ status,
               
                data: { servers: response.data.servers 
                   .filter(server => server.status === status)}
                }
            );
            subscriber.complete();
          })
          .pipe(
            tap(console.log),
            catchError(this.handleError)
          );
      

  ping$ = (ipAddress: string) => <Observable<CustomResponse>>
    this.http.get<CustomResponse>(this.apiUrl+'/server/ping/'+ipAddress)
  .pipe(
    tap(console.log),
    catchError(this.handleError)

  );


  delete$ = (serverId: number) => <Observable<CustomResponse>>
    this.http.delete<CustomResponse>(`${this.apiUrl}/server/delete/${serverId}`)
  .pipe(
    tap(console.log),
    catchError(this.handleError)

  );


  private handleError(error: any): Observable<never> {
    console.log(error);
    return throwError('An error occured - error code:} ' + error.status);
  }

}


