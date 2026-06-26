import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const QueuePublic = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Redirect to business page with queue tab
  useEffect(() => {
    if (slug) {
      navigate(`/${slug}?tab=queue`, { replace: true });
    }
  }, [slug, navigate]);

  return null;
};

export default QueuePublic;
