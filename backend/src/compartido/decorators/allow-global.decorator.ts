import { SetMetadata } from '@nestjs/common';

export const ALLOW_GLOBAL_KEY = 'allowGlobal';

export const AllowGlobal = () => SetMetadata(ALLOW_GLOBAL_KEY, true);
