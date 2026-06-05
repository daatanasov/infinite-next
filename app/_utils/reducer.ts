import { PicsumImage } from "../_hooks/useCircularCarousel";

interface State {
  items: (PicsumImage | undefined)[];
  isLoadingForward: boolean;
  isLoadingBackward: boolean;
  error: string | null;
}

type Action =
  | { type: "LOAD_START"; direction: "forward" | "backward" }
  | { type: "LOAD_SUCCESS"; items: (PicsumImage | undefined)[] }
  | { type: "LOAD_ERROR"; message: string }
  | { type: "CLEAR_ERROR" };

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOAD_START":
      return {
        ...state,
        isLoadingForward: action.direction === "forward",
        isLoadingBackward: action.direction === "backward",
      };
    case "LOAD_SUCCESS":
      return {
        ...state,
        items: action.items,
        isLoadingForward: false,
        isLoadingBackward: false,
      };
    case "LOAD_ERROR":
      return {
        ...state,
        isLoadingForward: false,
        isLoadingBackward: false,
        error: action.message,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
  }
}
