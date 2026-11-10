import { NextResponse } from 'next/server';

export const config = {};

export function middleware(req: any) {
    return NextResponse.next();
}
