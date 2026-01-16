import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Plus } from 'lucide-react';

export function Column({ column, tasks, onAddTask, onDeleteTask }) {
  const { setNodeRef } = useDroppable({
    id: column.id,
    data: {
        type: 'Column',
        column,
    }
  });

  return (
    <div className="flex flex-col w-80 min-w-[320px] h-full rounded-xl bg-muted/30 border border-border/50">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/40">
        <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{column.title}</h2>
            <span className="bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {tasks.length}
            </span>
        </div>
        <button 
            onClick={() => onAddTask(column.id)}
            className="hover:bg-muted p-1 rounded transition-colors text-muted-foreground hover:text-foreground"
        >
            <Plus size={18} />
        </button>
      </div>

      {/* Task List */}
      <div ref={setNodeRef} className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onDelete={onDeleteTask} />
            ))}
        </SortableContext>
        
        {tasks.length === 0 && (
            <div className="h-24 border-2 border-dashed border-border/40 rounded-lg flex items-center justify-center text-muted-foreground/40 text-sm">
                Drop tasks here
            </div>
        )}
      </div>
    </div>
  );
}
