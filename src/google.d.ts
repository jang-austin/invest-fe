interface Window {
  google: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
          auto_select?: boolean;
        }): void;
        renderButton(
          element: HTMLElement,
          options: {
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            width?: number;
            text?: string;
            locale?: string;
          }
        ): void;
        prompt(): void;
        disableAutoSelect(): void;
        revoke(hint: string, done: () => void): void;
      };
    };
  };
}
