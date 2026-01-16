import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

export function TaskCard({ task, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
        type: 'Task',
        task,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative bg-card hover:ring-2 hover:ring-indigo-500/20 border border-border p-3 rounded-lg shadow-sm cursor-grab active:cursor-grabbing mb-2
        ${isDragging ? 'ring-2 ring-indigo-500 z-50' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="flex justify-between items-start gap-2">
         <div className="flex-1">
            <h4 className="text-sm font-medium text-foreground leading-tight">{task.title}</h4>
         </div>
         <button 
            onClick={(e) => {
                e.stopPropagation(); // Prevent drag start
                onDelete(task.id);
            }}
            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
         >
             <Trash2 size={14} />
         </button>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
         {task.color ? (
             <div className={`h-1 w-8 rounded-full ${task.color}`} />
         ) : <div />}

         {task.creatorPhoto ? (
             <img src={task.creatorPhoto} title={`Created by ${task.creatorName}`} className="h-5 w-5 rounded-full border border-background" />
         ) : task.creatorName === 'WhatsApp' ? (
             <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center text-[8px] font-bold text-white" title="Created via WhatsApp">WA</div>
         ) : null}
      </div>
    </div>
  );
}