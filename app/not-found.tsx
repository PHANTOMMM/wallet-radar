import { ErrorBox } from "@/components/Errors";
export default function NotFound() {
  return <ErrorBox title="Nothing here" message="That page, address, transaction or token could not be found on this network." hint="Check the network selector: the same 0x address can exist on several chains." />;
}
