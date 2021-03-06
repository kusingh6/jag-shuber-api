import ApiClient from '../ExtendedClient';
import { Assignment, Courthouse, Region, Duty, Courtroom, DutyRecurrence, Sheriff, SheriffDuty } from '../models';
import TestUtils from './TestUtils';
import moment from 'moment';

describe('Duty API', () => {
    let api: ApiClient;

    let testRegion: Region;
    let testCourthouse: Courthouse;
    let testCourtroom: Courtroom;
    let testAssignment: Assignment;
    let testSheriff: Sheriff;

    const entityToCreate: Duty = {
        startDateTime: moment().toISOString(),
        endDateTime: moment().add(1, 'hours').toISOString(),
        assignmentId: "ToReplace"
    };

    let createdEntity: Duty;
    let createdEntityWithSheriffDuties: Duty;
    const createdDuties: Duty[] = [];

    function assertDutiesMatch(actualDuty: Duty, expectedDuty: Duty) {
        const { startDateTime: expectedStart, endDateTime: expectedEnd, ...restExpected } = expectedDuty;
        const { startDateTime: actualStart, endDateTime: actualEnd, ...restActual } = actualDuty;
        expect(restActual).toMatchObject(restExpected);
        expect(expectedStart).momentIsSame(actualStart);
        expect(expectedEnd).momentIsSame(actualEnd);
    }

    describe('CRUD Operations', () => {
        beforeAll(async (done) => {
            api = TestUtils.getClient();
            await TestUtils.clearDatabase();
            testRegion = await TestUtils.newTestRegion();
            testCourthouse = await TestUtils.newTestCourthouse(testRegion.id);
            testCourtroom = await TestUtils.newTestCourtroom(testCourthouse.id);
            testAssignment = await TestUtils.newTestAssignment(testCourthouse.id, { courtroomId: testCourtroom.id });
            testSheriff = await TestUtils.newTestSheriff(testCourthouse.id);
            done();
        });

        it('create should return new Duty', async () => {
            createdEntity = await api.CreateDuty({
                ...entityToCreate,
                assignmentId: testAssignment.id
            });
            createdDuties.push(createdEntity);
            expect(createdEntity).toBeDefined();
            expect(createdEntity.id).toBeDefined();
            expect(createdEntity.assignmentId).toEqual(testAssignment.id);
            expect(createdEntity).toEqual({
                ...createdEntity,
                ...entityToCreate,
                assignmentId: testAssignment.id
            });
            expect(Array.isArray(createdEntity.sheriffDuties)).toBeTruthy();
            expect(createdEntity.sheriffDuties.length).toEqual(0);
        });

        it('create should return new Duty with sheriffDuties if specified', async () => {
            createdEntityWithSheriffDuties = await api.CreateDuty({
                ...entityToCreate,
                assignmentId: testAssignment.id,
                sheriffDuties: [
                    {
                        sheriffId: testSheriff.id,
                        startDateTime: entityToCreate.startDateTime,
                        endDateTime: entityToCreate.endDateTime
                    }
                ]
            });
            createdDuties.push(createdEntityWithSheriffDuties);
            expect(createdEntityWithSheriffDuties).toBeDefined();
            expect(createdEntityWithSheriffDuties.id).toBeDefined();
            expect(createdEntityWithSheriffDuties.assignmentId).toEqual(testAssignment.id);
            const sheriffDuties = createdEntityWithSheriffDuties.sheriffDuties;
            expect(Array.isArray(sheriffDuties)).toBeTruthy();
            expect(sheriffDuties[0].dutyId).toEqual(createdEntityWithSheriffDuties.id);
            expect(sheriffDuties[0].startDateTime).momentIsSame(entityToCreate.startDateTime);
            expect(sheriffDuties[0].endDateTime).momentIsSame(entityToCreate.endDateTime);
            expect(sheriffDuties[0].sheriffId).toEqual(testSheriff.id);
        });

        it('get by id should return Duty', async () => {
            const retrieved = await api.GetDutyById(createdEntity.id);
            expect(retrieved).toMatchObject(createdEntity);
            const retrievedWithChildren = await api.GetDutyById(createdEntityWithSheriffDuties.id);
            expect(retrievedWithChildren).toMatchObject(createdEntityWithSheriffDuties);
        });

        it('get List should return list of Duties', async () => {
            const list = await api.GetDuties();
            expect(list).toBeDefined();
            expect(Array.isArray(list)).toBeTruthy();
            expect(list.length).toEqual(createdDuties.length);
            expect(list).toEqual(expect.arrayContaining(createdDuties));
        });

        it('update duty should return updated Duty', async () => {
            const newEndDateTime = moment().add(4, 'hour').format()
            const updatedEntity = await api.UpdateDuty(createdEntity.id, {
                ...createdEntity,
                endDateTime: newEndDateTime
            } as Duty);

            assertDutiesMatch(updatedEntity, {
                ...createdEntity,
                endDateTime: newEndDateTime
            });
            createdEntity = updatedEntity;
        });

        it('update duty should create sheriff duties that are new', async () => {
            const newSheriffDuty: SheriffDuty = {
                startDateTime: moment().add(3, 'hour').format(),
                endDateTime: moment().add(4, 'hour').format()
            }
            const updatedEntity = await api.UpdateDuty(createdEntityWithSheriffDuties.id, {
                ...createdEntityWithSheriffDuties,
                sheriffDuties: [
                    ...createdEntityWithSheriffDuties.sheriffDuties,
                    newSheriffDuty
                ]
            });
            const sheriffDuties = updatedEntity.sheriffDuties;
            expect(Array.isArray(sheriffDuties)).toBeTruthy();
            expect(sheriffDuties.length).toEqual(2);
            const newDuty = sheriffDuties.find(sd => sd.id != createdEntityWithSheriffDuties.sheriffDuties[0].id);
            expect(newDuty.startDateTime).momentIsSame(newSheriffDuty.startDateTime);
            expect(newDuty.endDateTime).momentIsSame(newSheriffDuty.endDateTime);
            expect(newDuty.dutyId).toEqual(createdEntityWithSheriffDuties.id);
            expect(newDuty.id).toBeDefined();
            createdEntityWithSheriffDuties = updatedEntity;
        });

        it('update duty should update existing Sheriff Duties', async () => {
            const sheriffDutyUpdates: SheriffDuty = {
                startDateTime: moment().add(8, 'hour').toISOString(),
                endDateTime: moment().add(9, 'hour').toISOString()
            }
            const updatedEntity = await api.UpdateDuty(createdEntityWithSheriffDuties.id, {
                ...createdEntityWithSheriffDuties,
                sheriffDuties: [
                    ...createdEntityWithSheriffDuties.sheriffDuties.map(sd => (
                        {
                            ...sd,
                            ...sheriffDutyUpdates
                        }
                    ))
                ]
            });
            const sheriffDuties = updatedEntity.sheriffDuties;
            expect(Array.isArray(sheriffDuties)).toBeTruthy();
            expect(sheriffDuties.length).toEqual(2);
            sheriffDuties.forEach(sd => {
                expect(sd.startDateTime).toEqual(sheriffDutyUpdates.startDateTime);
                expect(sd.endDateTime).toEqual(sheriffDutyUpdates.endDateTime);
                expect(sd.dutyId).toEqual(createdEntityWithSheriffDuties.id);
                expect(sd.id).toBeDefined();
            });
            createdEntityWithSheriffDuties = updatedEntity;
        });

        it('delete should delete Duty', async () => {
            await api.DeleteDuty(createdEntity.id);
            const retreived = await api.GetDutyById(createdEntity.id);
            expect(retreived).toBeUndefined();
        });

        it('delete should delete Duty and Sheriff Duties', async () => {
            await api.DeleteDuty(createdEntityWithSheriffDuties.id);
            const retreived = await api.GetDutyById(createdEntityWithSheriffDuties.id);
            expect(retreived).toBeUndefined();
            createdEntityWithSheriffDuties.sheriffDuties.forEach(async (sd) => {
                const retrievedSd = await api.GetSheriffDutyById(sd.id);
                expect(retrievedSd).toBeUndefined();
            });
        });
    });

    describe('Import Default Duties', () => {
        const recurrenceToCreate: DutyRecurrence = {
            daysBitmap: 1 << moment().isoWeekday() - 1,
            startTime: "10:00:00",
            endTime: "11:00:00",
            sheriffsRequired: 2
        }



        beforeEach(async (done) => {
            const { sheriff_duty, duty, assignment, duty_recurrence } = TestUtils.tables;
            await TestUtils.clearTable(undefined, sheriff_duty, duty, duty_recurrence, assignment);
            done();
        })

        it('import defaults should create duties with correct details', async () => {
            const recurrences: DutyRecurrence[] = [
                {
                    ...recurrenceToCreate
                }
            ];
            const assignment = await TestUtils.newTestAssignment(testCourthouse.id, { dutyRecurrences: recurrences, courtroomId: testCourtroom.id });

            const duties = await api.ImportDefaultDuties({ courthouseId: assignment.courthouseId });
            expect(Array.isArray(duties)).toBeTruthy();
            expect(duties.length).toEqual(assignment.dutyRecurrences.length);
            TestUtils.assertImportedDuties(duties, assignment);
        });

        it('import defaults should create duties with correct supporting late start/end times', async () => {
            const recurrences: DutyRecurrence[] = [
                {
                    ...recurrenceToCreate,
                    startTime: "16:00:00-07",
                    endTime: "22:00:00-07"
                }
            ];
            const assignment = await TestUtils.newTestAssignment(testCourthouse.id, { dutyRecurrences: recurrences, courtroomId: testCourtroom.id });

            const duties = await api.ImportDefaultDuties({ courthouseId: assignment.courthouseId });
            expect(Array.isArray(duties)).toBeTruthy();
            expect(duties.length).toEqual(assignment.dutyRecurrences.length);
            TestUtils.assertImportedDuties(duties, assignment);
        });

        it('import defaults should create duties/sheriff Duties for each recurrence', async () => {
            const recurrences: DutyRecurrence[] = [
                {
                    ...recurrenceToCreate
                },
                {
                    ...recurrenceToCreate,
                    startTime: "13:00:00",
                    endTime: "15:30:00",
                    sheriffsRequired: 3
                }
            ];

            const assignment = await TestUtils.newTestAssignment(testCourthouse.id, { dutyRecurrences: recurrences, courtroomId: testCourtroom.id });

            const duties = await api.ImportDefaultDuties({ courthouseId: assignment.courthouseId });
            expect(Array.isArray(duties)).toBeTruthy();
            expect(duties.length).toEqual(assignment.dutyRecurrences.length);
            TestUtils.assertImportedDuties(duties, assignment);
        });

        it('import defaults should not recreate duties for already duty recurrences that have already been processed', async () => {
            const recurrences: DutyRecurrence[] = [
                {
                    ...recurrenceToCreate
                },
                {
                    ...recurrenceToCreate,
                    startTime: "13:00:00",
                    endTime: "15:30:00",
                    sheriffsRequired: 3
                }
            ];

            const assignment = await TestUtils.newTestAssignment(testCourthouse.id, { dutyRecurrences: recurrences, courtroomId: testCourtroom.id });
            const duties = await api.ImportDefaultDuties({ courthouseId: assignment.courthouseId });
            const secondImport = await api.ImportDefaultDuties({ courthouseId: assignment.courthouseId });
            expect(Array.isArray(secondImport)).toBeTruthy();
            expect(secondImport.length).toEqual(0);
        });

        it('import defaults should only create duties for day passed in', async () => {
            const recurrences: DutyRecurrence[] = [
                {
                    ...recurrenceToCreate
                },
                {
                    ...recurrenceToCreate,
                    daysBitmap: 1 << (moment().isoWeekday() % 6),  // use the next days bitmap
                    startTime: "13:00:00",
                    endTime: "15:30:00",
                    sheriffsRequired: 3
                }
            ];

            const assignment = await TestUtils.newTestAssignment(testCourthouse.id, { dutyRecurrences: recurrences, courtroomId: testCourtroom.id });
            const duties = await api.ImportDefaultDuties({ courthouseId: assignment.courthouseId });
            expect(Array.isArray(duties)).toBeTruthy();
            expect(duties.length).toEqual(1);
            TestUtils.assertImportedDuties(duties, assignment);
        });




    })


}) 