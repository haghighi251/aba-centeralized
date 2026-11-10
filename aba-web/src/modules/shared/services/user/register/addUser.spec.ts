import { GenderType } from '@/shared/types/user/userProfile';
import { TRegisterUserRequest } from '@/shared/types/user/registerUserSchema';

import { addUser } from './addUser';

const validParams: TRegisterUserRequest = {
    csrfToken: 'csrf-token',
    loginUserName: 'sepi',
    email: 'sep@gmail.com',
    firstName: 'sep',
    lastName: 'soh',
    gender: GenderType.Male,
    dateOfBirth: new Date('1997-03-09'),
    phoneNumber: '9369678828',
    phoneNumberPrefix: '+98',
    password: 'Sep@1234',
};

describe('addUser', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should resolve with the given params when they are valid', async () => {
        const promise = addUser(validParams);

        jest.runAllTimers();

        await expect(promise).resolves.toEqual(validParams);
    });

    it('should throw a BAD_REQUEST error when the params are invalid', async () => {
        const invalidParams = {
            ...validParams,
            email: 'not-an-email',
        } as TRegisterUserRequest;

        await expect(addUser(invalidParams)).rejects.toThrow('BAD_REQUEST');
    });
});
