import React, { useState, useEffect } from 'react';
import { 
    DndContext, 
    DragOverlay, 
    closestCorners, 
    KeyboardSensor, 
    PointerSensor, 
    useSensor, 
    useSensors,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column } from './Column';
import { TaskCard } from './TaskCard';

const COLUMNS = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'done', title: 'Done' }
];

const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
};

export function Board({ socket }) {
    const [tasks, setTasks] = useState([]);
    const [activeId, setActiveId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Avoid accidental drags on clicks
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        // Initial Fetch
        fetch('http://localhost:3001/api/tasks')
            .then(res => res.json())
            .then(data => setTasks(data));

        // Socket Listeners
        const onTaskCreated = (newTask) => {
            setTasks(prev => [...prev, newTask]);
        };

        const onTaskMoved = (data) => {
            setTasks(prev => {
                const newTasks = prev.map(t => {
                   if (t.id === data.id) {
                       return { ...t, columnId: data.columnId, order: data.order };
                   }
                   return t;
                });
                return newTasks; // In a real app we might re-sort properly here based on full order list
            });
        };

        const onTaskDeleted = (id) => {
            setTasks(prev => prev.filter(t => t.id !== id));
        };

        socket.on('task:created', onTaskCreated);
        socket.on('task:moved', onTaskMoved);
        socket.on('task:deleted', onTaskDeleted);

        return () => {
            socket.off('task:created', onTaskCreated);
            socket.off('task:moved', onTaskMoved);
            socket.off('task:deleted', onTaskDeleted);
        };
    }, [socket]);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        if (activeId === overId) return;

        const isActiveTask = active.data.current?.type === 'Task';
        const isOverTask = over.data.current?.type === 'Task';
        const isOverColumn = over.data.current?.type === 'Column';

        if (!isActiveTask) return;

        // Task dropped over another task
        if (isActiveTask && isOverTask) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const overIndex = tasks.findIndex((t) => t.id === overId);

                if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
                    // Moving to different column
                    const updatedTasks = [...tasks];
                    updatedTasks[activeIndex].columnId = tasks[overIndex].columnId;
                    return arrayMove(updatedTasks, activeIndex, overIndex);
                }

                return arrayMove(tasks, activeIndex, overIndex);
            });
        }
        
        // Task dropped over a column (empty area)
        if (isActiveTask && isOverColumn) {
            setTasks((tasks) => {
                const activeIndex = tasks.findIndex((t) => t.id === activeId);
                const updatedTasks = [...tasks];
                updatedTasks[activeIndex].columnId = overId; // overId is columnId
                return arrayMove(updatedTasks, activeIndex, activeIndex);
            });
        }
    };

    const handleDragEnd = (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        const activeTask = tasks.find(t => t.id === activeId);
        
        if (!activeTask) return;

        // Calculate new state for persistence
        // We need to find the new index/order.
        // In this simple implementation, we just trust the visual order in the array
        // But since 'tasks' is flat, we need to be careful.
        
        // Let's just emit the new column and a simple order index based on position in that column.
        
        // Note: The visual update happened in handleDragOver (Optimistic), 
        // so 'tasks' state is already sorted for the user. We just need to sync it.
        
        const columnTasks = tasks.filter(t => t.columnId === activeTask.columnId); // tasks already has new columnId from dragOver
        const newOrder = columnTasks.findIndex(t => t.id === activeId);

        socket.emit('task:move', {
            id: activeId,
            columnId: activeTask.columnId,
            order: newOrder
        });
    };

    const handleCreateTask = (columnId) => {
        const title = prompt("Enter task title:");
        if (!title) return;
        
        // Random color
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Find max order in this column
        const columnTasks = tasks.filter(t => t.columnId === columnId);
        const maxOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map(t => t.order)) : -1;

        socket.emit('task:create', {
            title,
            columnId,
            order: maxOrder + 1,
            color
        });
    };

    const handleDeleteTask = (id) => {
        if(confirm("Are you sure you want to delete this task?")) {
            socket.emit('task:delete', id);
        }
    };

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    return (
        <div className="h-full w-full overflow-x-auto p-6 bg-background/50">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full gap-6">
                    {COLUMNS.map((col) => (
                        <Column 
                            key={col.id} 
                            column={col} 
                            tasks={tasks.filter(t => t.columnId === col.id)}
                            onAddTask={handleCreateTask}
                            onDeleteTask={handleDeleteTask}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? (
                        <TaskCard task={activeTask} />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
