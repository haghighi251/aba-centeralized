import {
    IRegisterUserSchema,
    TRegisterUserRequest,
} from '@/shared/types/user/registerUserSchema';

import { REGISTER } from '../../../constants/apiRoutes';

export const addUser = async (params: TRegisterUserRequest) => {
    const result = IRegisterUserSchema.safeParse(params);

    // ToDo: Change REGISTER with registerApiRoute
    // if (result.success) return axiosClient.post(REGISTER, params);

    // Handle mock request
    if (result.success) {
        // Wait for 2 seconds before returning the params
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return params;
    }
    throw new Error(
        `BAD_REQUEST: Parameters for ${REGISTER} are invalid!` + params,
    );
};
