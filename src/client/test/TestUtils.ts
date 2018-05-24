import { toMatchShapeOf, toMatchOneOf } from 'jest-to-match-shape-of';
import db from '../../db/Database';
import ExtendedClient from '../ExtendedClient';
import { Courthouse, Courtroom, Assignment, Region } from '../models';
import { Sheriff } from '../../models/Sheriff';

expect.extend({
    toMatchShapeOf,
    toMatchOneOf
});

export default class TestUtils {
    private static tablesToClear = [
        'sheriff_duty',
        'duty',
        'duty_recurrence',
        'assignment',
        'courtroom',
        'run',
        'shift',
        'sheriff',
        'courthouse',
        'region'
    ]
    constructor() {

    }

    static getClient(): ExtendedClient {
        // const url = 'http://api-integration-tests.192.168.99.100.nip.io/api/v1'
        const url = 'http://localhost:3001/api/v1';
        return new ExtendedClient(url);
    }

    static async clearDatabase() {
        const client = await db.getClient();
        await db.transaction(async (client) => {
            await TestUtils.tablesToClear.forEach(async (table) => {
                await client.query(`DELETE FROM ${table};`)
            });
        })
    }

    static async closeDatabase() {
        await db.close();
    }

    static randomString(length: number) {
        let str = "";
        for (let i = 0; i < length; ++i) {
            str = `${str}${String.fromCharCode(65 + (Math.random() * 25))}`
        }
        return str;
    }

    static async newTestRegion(): Promise<Region> {
        const api = TestUtils.getClient();
        return await api.CreateRegion({
            name: "TEST Region",
            code: TestUtils.randomString(5)
        });
    }

    static async newTestCourthouse(regionId: string): Promise<Courthouse> {
        const api = TestUtils.getClient();
        return await api.CreateCourthouse({
            regionId,
            name: "TEST COURTHOUSE",
            code: TestUtils.randomString(5)
        });
    }

    static async newTestCourtroom(courthouseId: string): Promise<Courtroom> {
        const api = TestUtils.getClient();
        return await api.CreateCourtroom({
            name: "TEST COURTROOM",
            courthouseId,
            code: TestUtils.randomString(5)
        });
    }

    static async newTestAssignment(courthouseId, assignmentDetails: Partial<Assignment> = { }): Promise<Assignment> {
        const api = TestUtils.getClient();
        let workSectionId="";
        if(assignmentDetails.jailRoleCode){
            workSectionId="JAIL";
        }else if(assignmentDetails.runId){
            workSectionId="ESCORTS";
        }else if(assignmentDetails.courtroomId){
            workSectionId="COURTS";
        }else if(assignmentDetails.otherAssignCode){
            workSectionId="OTHER";
        }
        return await api.CreateAssignment({
            ...assignmentDetails,
            workSectionId,
            courthouseId
        });
    }


    static async newTestSheriff(courthouseId: string,sheriff?:Partial<Sheriff>): Promise<Sheriff> {
        const api = TestUtils.getClient();
        return await api.CreateSheriff({
            badgeNo:TestUtils.randomString(5),
            firstName:'Bill',
            lastName:'Nye',
            rankCode:'DEPUTYSHERIFF',
            homeCourthouseId:courthouseId
        }) as Sheriff;
    }

}

beforeAll(async (done) => {
    await TestUtils.clearDatabase();
    done();
});

afterAll(async () => {
    // Don't wait for the database to close, hoping it does
    TestUtils.closeDatabase();
});