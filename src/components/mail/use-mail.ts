import { atom, useAtom } from "jotai"

interface Config {
  selected: string | null
}

const configAtom = atom<Config>({
  selected: null,
})

export function useMail() {
  return useAtom(configAtom)
}
