import { useState, useEffect } from "react";
import { supabase } from "./src/services/supabase";
type Todo = {
  id: number;
  name: string;
};

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getTodos = async () => {
      setLoading(true);

      const { data, error } = await supabase.from("todos").select("*");

      if (error) {
        console.error("Error fetching todos:", error.message);
        setLoading(false);
        return;
      }

      setTodos(data || []);
      setLoading(false);
    };

    getTodos();
  }, []);

  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>{todo.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}