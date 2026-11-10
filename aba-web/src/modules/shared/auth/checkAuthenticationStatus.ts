import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function userIsAuthorized(){
const session = await getServerSession();
if(!session || !session.user) redirect('/api/auth/signin');
else return;
}