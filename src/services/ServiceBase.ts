import { v4 as uuid } from 'uuid';
import { ICrudService } from "../infrastructure";
import { default as moment, Moment } from 'moment';

export abstract class ServiceBase<T> implements ICrudService<T> {
    abstract getAll(): Promise<T[]>;
    abstract getById(id: string): Promise<T | undefined>;
    abstract create(entity: Partial<T>): Promise<T>
    abstract update(entity: Partial<T>): Promise<T>;
    abstract delete(id: string): Promise<void>;

    generateUuid(): string {
        return uuid();
    }

    filterNullValues<T>(object: any): T {
        let returnObj = {};
        Object.keys(object)
            .filter(k => object[k] !== null)
            .forEach(k => {
                returnObj[k] = object[k];
            })
        return returnObj as T;
    }

    adjustForTimezone(dateMoment:Moment):Moment{
         // HACK: this is to fix the timezone offsets for the demo
            // we should be storing timezone information in the time 
            // and dealing with it in and out of the database
            const pacificTimeZoneOffset = 7 * 60; // 7 hours * 60 minutes
            const timeOffset = dateMoment.utcOffset() + pacificTimeZoneOffset;
            console.log(`Time Offset ${timeOffset} minutes`);
            return moment(dateMoment).add(timeOffset, 'minutes')
            
    }
}