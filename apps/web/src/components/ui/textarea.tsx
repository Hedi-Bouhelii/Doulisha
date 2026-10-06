import * as React from 'react';

import { fieldControlClass } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldControlClass,
        'flex field-sizing-content min-h-24 px-3.5 py-2.5 leading-relaxed',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
