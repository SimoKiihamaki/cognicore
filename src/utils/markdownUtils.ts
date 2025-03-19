/**
 * Insert markdown syntax at the cursor position or around selected text
 */
export const insertMarkdown = (
  textarea: HTMLTextAreaElement,
  markdownBefore: string,
  markdownAfter: string = '',
  defaultText: string = ''
): void => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);
  
  // If no text is selected, insert markdown with default text
  const textToInsert = selectedText || defaultText;
  const newText = 
    text.substring(0, start) +
    markdownBefore +
    textToInsert +
    markdownAfter +
    text.substring(end);
  
  textarea.value = newText;
  
  // Set cursor position after the inserted text
  const newCursorPos = start + markdownBefore.length + textToInsert.length + markdownAfter.length;
  
  // Focus the textarea and set selection
  textarea.focus();
  textarea.selectionStart = selectedText ? start + markdownBefore.length : start + markdownBefore.length;
  textarea.selectionEnd = selectedText ? start + markdownBefore.length + selectedText.length : newCursorPos;
};

/**
 * Insert a line of markdown at the start of the current line or selected lines
 */
export const insertLineMarkdown = (
  textarea: HTMLTextAreaElement,
  markdownPrefix: string,
  defaultText: string = ''
): void => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  
  // Find the start and end of the lines containing the selection
  let lineStart = start;
  while (lineStart > 0 && text.charAt(lineStart - 1) !== '\n') {
    lineStart--;
  }
  
  const selectedText = text.substring(lineStart, end);
  
  // If multiple lines are selected, add markdown to each line
  if (selectedText.includes('\n')) {
    const lines = selectedText.split('\n');
    const modifiedLines = lines.map(line => markdownPrefix + line);
    const newText = 
      text.substring(0, lineStart) +
      modifiedLines.join('\n') +
      text.substring(end);
    
    textarea.value = newText;
    textarea.selectionStart = lineStart;
    textarea.selectionEnd = lineStart + modifiedLines.join('\n').length;
  } else {
    // Single line - add markdown at the beginning
    const textToInsert = selectedText || defaultText;
    const newText = 
      text.substring(0, lineStart) +
      markdownPrefix +
      textToInsert +
      text.substring(end);
    
    textarea.value = newText;
    
    if (selectedText) {
      // If text was selected, keep the selection
      textarea.selectionStart = lineStart + markdownPrefix.length;
      textarea.selectionEnd = lineStart + markdownPrefix.length + selectedText.length;
    } else {
      // If no text was selected, place cursor at the end of the inserted text
      const newPos = lineStart + markdownPrefix.length + defaultText.length;
      textarea.selectionStart = newPos;
      textarea.selectionEnd = newPos;
    }
  }
  
  textarea.focus();
};

/**
 * Handle keyboard shortcuts for markdown formatting
 */
export const handleMarkdownShortcuts = (
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  textarea: HTMLTextAreaElement
): boolean => {
  // Check for Ctrl/Cmd key combinations
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'b': // Bold
        event.preventDefault();
        insertMarkdown(textarea, '**', '**', 'bold text');
        return true;
      
      case 'i': // Italic
        event.preventDefault();
        insertMarkdown(textarea, '*', '*', 'italic text');
        return true;
      
      case 'k': // Link
        event.preventDefault();
        insertMarkdown(textarea, '[', '](url)', 'link text');
        return true;
      
      case 'h': // Heading
        event.preventDefault();
        insertLineMarkdown(textarea, '# ', 'Heading');
        return true;
      
      case '1': // H1
        if (event.shiftKey) {
          event.preventDefault();
          insertLineMarkdown(textarea, '# ', 'Heading 1');
          return true;
        }
        break;
      
      case '2': // H2
        if (event.shiftKey) {
          event.preventDefault();
          insertLineMarkdown(textarea, '## ', 'Heading 2');
          return true;
        }
        break;
      
      case '3': // H3
        if (event.shiftKey) {
          event.preventDefault();
          insertLineMarkdown(textarea, '### ', 'Heading 3');
          return true;
        }
        break;
    }
  }
  
  return false;
};
