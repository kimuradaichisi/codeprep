export const InlineNotice = ({ message }: Readonly<{ message?: string }>) =>
  message ? <p className="inline-notice" role="alert">{message}</p> : null;

