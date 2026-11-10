import React from 'react';

import Container  from '@/components/Container/Container';
import { BaseLayout } from '@/modules/shared/layout/BaseLayout';
import RegisterPage from '@/modules/company/pages/RegisterPage/RegisterPage';

const page = async () => {

    return (
        <BaseLayout
            header={<></>}
            footer={<></>}
        >
            <Container>
                <RegisterPage />
            </Container>
        </BaseLayout>
    );
};

export default page;
